#!/usr/bin/env python3
"""Reproduce AETHER's bounded SLDEM2015 crop and nested height tiles.
Offline build tool; requires numpy (no browser/runtime dependency).
"""
import argparse, hashlib, json, math, pathlib, subprocess, tempfile
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/lunar'
SOURCE = 'https://imbrium.mit.edu/DATA/SLDEM2015/TILES/FLOAT_IMG/SLDEM2015_512_00N_30N_270_315_FLOAT'
RADIUS = 1737400.0
CENTER_LAT, CENTER_LON, SIZE, GRID, MAX_LEVEL, TILE_GRID = 23.7, 312.5, 60000.0, 1025, 4, 65
PPD, SOURCE_WIDTH = 512, 23040
SOURCE_SHA256 = "88ca3c4bca146dfb8e64877b8fcda7dfd23f4b0b370c967b21010ff270c3902b"

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def prepare(source_block, output=OUT):
    output.mkdir(parents=True, exist_ok=True)
    half_lat = math.degrees(SIZE / 2 / RADIUS)
    half_lon = half_lat / math.cos(math.radians(CENTER_LAT))
    north, south = CENTER_LAT + half_lat, CENTER_LAT - half_lat
    west, east = CENTER_LON - half_lon, CENTER_LON + half_lon
    # PDS image is pixel registered: centers lie half a pixel inside bounds.
    source_y = (30 - np.linspace(north, south, GRID)) * PPD - .5
    source_x = (np.linspace(west, east, GRID) - 270) * PPD - .5
    y0, y1 = math.floor(source_y[0]), math.ceil(source_y[-1])
    expected = (y1-y0+1) * SOURCE_WIDTH * 4
    if source_block.stat().st_size != expected:
        raise ValueError(f'Expected exactly {expected} range bytes; refusing a partial or whole-tile response')
    if sha(source_block) != SOURCE_SHA256:
        raise ValueError('Source range checksum mismatch; inspect the archive before regenerating')
    raw = np.memmap(source_block, dtype='<f4', mode='r', shape=(y1-y0+1,SOURCE_WIDTH))
    rows = source_y-y0; yi=np.floor(rows).astype(int); yf=(rows-yi)[:,None]
    xi=np.floor(source_x).astype(int); xf=(source_x-xi)[None,:]
    # Kilometres from label UNIT converted to metres; no synthetic relief.
    top=raw[yi[:,None],xi[None,:]]*(1-xf)+raw[yi[:,None],xi[None,:]+1]*xf
    bottom=raw[(yi+1)[:,None],xi[None,:]]*(1-xf)+raw[(yi+1)[:,None],xi[None,:]+1]*xf
    elevations=((top*(1-yf)+bottom*yf)*1000).astype('<f4')
    invalid=~np.isfinite(elevations)|(elevations < -20000)|(elevations > 20000)
    if np.any(invalid):
        raise ValueError(f'{np.count_nonzero(invalid)} missing/invalid samples: choose valid coverage rather than fabricate fill')
    elevations.tofile(output/'heights.bin')
    for level in range(MAX_LEVEL+1):
        divisions=2**level; step=(GRID-1)//(64*divisions)
        for x in range(divisions):
            folder=output/'tiles'/str(level)/str(x);folder.mkdir(parents=True,exist_ok=True)
            for y in range(divisions):
                tile=elevations[y*64*step:y*64*step+64*step+1:step,x*64*step:x*64*step+64*step+1:step]
                assert tile.shape==(TILE_GRID,TILE_GRID)
                tile.astype('<f4').tofile(folder/f'{y}.bin')
    manifest={
      'version':1,'id':'aristarchus','name':'Aristarchus crater','centerLat':CENTER_LAT,'centerLon':CENTER_LON,
      'sizeMeters':SIZE,'radiusMeters':RADIUS,'gridSize':GRID,'maxLevel':MAX_LEVEL,'tileGridSize':TILE_GRID,
      'minElevation':float(elevations.min()),'maxElevation':float(elevations.max()),
      'referenceElevation':float(elevations.mean()),'elevationOffset':0,
      'heightUrl':'heights.bin','tileTemplate':'tiles/{level}/{x}/{y}.bin',
      'textureTemplate':'tiles/{level}/{x}/{y}.jpg','regionTextureUrl':'region.jpg',
      'sourceResolutionMeters':59.2252938,'effectiveResolutionMeters':[60,100],
      'gridSpacingMeters':SIZE/(GRID-1),'imageryResolutionMeters':None,
      'bounds':{'north':north,'south':south,'west':west,'east':east},
      'projection':'local simple cylindrical, x east / z south; longitude scaled by cos(center latitude)',
      'coordinateFrame':'Mean Earth / Polar Axis of DE421; planetocentric latitude, east-positive longitude',
      'verticalDatum':'Height in metres relative to sphere radius 1737400 m; no geoid correction',
      'verticalExaggeration':1,'noDataCount':0,
      'sources':[{'id':'sldem2015','product':'SLDEM2015_512_00N_30N_270_315_FLOAT',
        'data':SOURCE+'.IMG','label':SOURCE+'.LBL','overview':'https://pgda.gsfc.nasa.gov/products/54',
        'citation':'Barker et al. (2016), Icarus 273, 346–355, doi:10.1016/j.icarus.2015.07.039',
        'credit':'NASA/GSFC/MIT LOLA team and JAXA/SELENE Terrain Camera team',
        'rangeBytes':[y0*SOURCE_WIDTH*4,(y1+1)*SOURCE_WIDTH*4-1],
        'rangeSha256':sha(source_block)}],
      'heightSha256':sha(output/'heights.bin'),
      'lodSpacingMeters':[SIZE/(64*2**l) for l in range(MAX_LEVEL+1)]
    }
    # Preserve imagery metadata on DEM-only regeneration.
    if (output/'manifest.json').exists():
        old=json.loads((output/'manifest.json').read_text())
        manifest['sources'].extend(source for source in old.get('sources',[]) if source.get('id') != 'sldem2015')
        for key in ['imageryResolutionMeters','imagerySource','imageryAlignment']:
            if key in old:manifest[key]=old[key]
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({k:manifest[k] for k in ['name','bounds','minElevation','maxElevation','referenceElevation','heightSha256']},indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-block',type=pathlib.Path,default=pathlib.Path(tempfile.gettempdir())/'aristarchus-dem-source.bin')
    parser.add_argument('--output',type=pathlib.Path,default=OUT)
    parser.add_argument('--download',action='store_true')
    args=parser.parse_args()
    if args.download:
        # Query isolates an explicit byte-range cache key on intervening proxies.
        subprocess.run(['curl','-fL','--retry','2','--range','250490880-344033279',SOURCE+'.IMG?aether=aristarchus1','-o',str(args.source_block)],check=True)
    prepare(args.source_block,args.output)

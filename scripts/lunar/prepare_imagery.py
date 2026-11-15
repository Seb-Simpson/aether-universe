#!/usr/bin/env python3
"""Reproduce the bounded LROC WAC texture crop and progressive image tiles.

Offline prerequisites: numpy, Pillow, requests. The DEM processor must have
created manifest.json first. Missing source rows and the embedded PDS label
are downloaded as explicit bounded ranges; no browser/runtime service is used.
"""
import argparse
import hashlib
import json
import math
import re
import tempfile
from pathlib import Path

import numpy as np
import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
URL = (
    'https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/'
    'LROLRC_2001/DATA/BDR/WAC_GLOBAL/WAC_GLOBAL_E300N3150_100M.IMG'
)
RESOLUTION = 303.23350424149
STRIDE = 27291 * 4
SOURCE_SHA256 = '525198af18694914bc82ec806602cfd819de4432c476f2d76fac63c65e424e8e'


def bounded_download(start, end, destination):
    """Reject ignored ranges before reading a potentially multi-GB response."""
    with requests.get(
        URL + f'?aether-range={start}-{end}',
        headers={'Range': f'bytes={start}-{end}'},
        timeout=(30, 180),
        stream=True,
    ) as response:
        response.raise_for_status()
        if response.status_code != 206:
            raise ValueError('Archive did not honour the requested byte range')
        expected_range = f'bytes {start}-{end}/'
        if not response.headers.get('Content-Range', '').startswith(expected_range):
            raise ValueError('Archive returned the wrong Content-Range')
        # Interrupted downloads must never become cached input.
        partial = destination.with_suffix(destination.suffix + '.partial')
        try:
            total = 0
            with partial.open('wb') as output:
                for chunk in response.iter_content(1024 * 1024):
                    total += len(chunk)
                    if total > end - start + 1:
                        raise ValueError('Archive response exceeded the bounded range')
                    output.write(chunk)
            if total != end - start + 1:
                raise ValueError('Archive returned an incomplete byte range')
            partial.replace(destination)
        finally:
            partial.unlink(missing_ok=True)


def prepare(source_block, source_label, output):
    manifest_path = output / 'manifest.json'
    m = json.loads(manifest_path.read_text())
    bounds = m['bounds']
    r0 = math.floor(18193.5 - bounds['north'] * RESOLUTION) - 2
    r1 = math.ceil(18193.5 - bounds['south'] * RESOLUTION) + 2
    start, end = STRIDE + r0 * STRIDE, STRIDE + (r1 + 1) * STRIDE - 1
    if not source_block.exists():
        bounded_download(start, end, source_block)
    raw = source_block.read_bytes()
    if len(raw) != end - start + 1:
        raise ValueError('Cached WAC source has the wrong bounded byte count')
    source_sha = hashlib.sha256(raw).hexdigest()
    if source_sha != SOURCE_SHA256:
        raise ValueError('Source row checksum changed; inspect the archive product before regenerating')

    # The first image record is the embedded PDS3 label. Fresh checkouts do not
    # rely on an undocumented /tmp/wac-label.raw left by initial investigation.
    if not source_label.exists():
        bounded_download(0, STRIDE - 1, source_label)
    label_raw = source_label.read_bytes()
    terminator = re.search(rb'(?m)^END[ \t]*\r?\n', label_raw)
    if not terminator:
        raise ValueError('Embedded WAC PDS label is incomplete')
    label = label_raw[:terminator.end()].decode('ascii')
    for expected in (
        'WAC_GLOBAL_E300N3150_100M', '109164', '303.23350424149',
        '18193.5', '-81873.5', 'PC_REAL',
    ):
        if expected not in label:
            raise ValueError(f'Unexpected WAC source metadata: missing {expected}')

    data = np.frombuffer(raw, dtype='<f4').reshape(r1 - r0 + 1, 27291)
    size = m['gridSize']
    lat = np.linspace(bounds['north'], bounds['south'], size)
    lon = np.linspace(bounds['west'], bounds['east'], size)
    y = 18193.5 - lat * RESOLUTION - r0
    x = -81873.5 + lon * RESOLUTION
    ix, iy = np.floor(x).astype(int), np.floor(y).astype(int)
    fx, fy = x - ix, y - iy
    vals = (
        (data[iy[:, None], ix[None, :]] * (1 - fx)
         + data[iy[:, None], ix[None, :] + 1] * fx) * (1 - fy[:, None])
        + (data[iy[:, None] + 1, ix[None, :]] * (1 - fx)
           + data[iy[:, None] + 1, ix[None, :] + 1] * fx) * fy[:, None]
    )
    valid = np.isfinite(vals) & (vals > -1e20)
    if not valid.all():
        raise ValueError('No-data requires explicit handling; never fabricate filled pixels')
    # One constant contrast mapping, without generated texture or relief.
    low, high = np.percentile(vals, [1, 99.7])
    pixels = np.uint8(np.clip((vals - low) / (high - low), 0, 1) * 205 + 28)
    image = Image.fromarray(pixels).convert('RGB')
    image.save(output / 'region.jpg', quality=95)
    cells = size - 1
    for level in range(m['maxLevel'] + 1):
        divisions = 2 ** level
        for ty in range(divisions):
            for tx in range(divisions):
                tile = image.crop((
                    tx * cells / divisions, ty * cells / divisions,
                    (tx + 1) * cells / divisions + 1,
                    (ty + 1) * cells / divisions + 1,
                ))
                # Deepest imagery samples the available source; parents have
                # less information. Resampling does not create source detail.
                target = min(257, tile.width)
                tile = tile.resize((target, target), Image.Resampling.LANCZOS)
                dest = output / f'tiles/{level}/{tx}/{ty}.jpg'
                dest.parent.mkdir(parents=True, exist_ok=True)
                tile.save(dest, quality=92)
    (output / 'source-imagery.lbl').write_text(label)
    m['imageryResolutionMeters'] = 100
    m['globeTextureUrl'] = 'moon.jpg'
    # Re-running the processor must not append duplicate provenance records.
    m['sources'] = [s for s in m['sources'] if s.get('id') != 'lroc-wac']
    m['sources'].append({
        'id': 'lroc-wac', 'product': 'WAC_GLOBAL_E300N3150_100M v1.3',
        'data': URL, 'overview': 'https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_GLOBAL/',
        'credit': 'NASA/GSFC/Arizona State University LROC team',
        'rangeBytes': [start, end], 'rangeSha256': source_sha,
        'note': '643nm morphologic mosaic, includes source illumination/shadows; '
                'georegistered by planetocentric east-positive PDS pixel centres. '
                'Display contrast stretched, not an elevation source.',
    })
    manifest_path.write_text(json.dumps(m, indent=2) + '\n')
    print('Imagery:', vals.min(), vals.max(), 'native pixels across region',
          size / (x[-1] - x[0]), 'oversampling; bytes', len(raw))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-block', type=Path,
                        default=Path(tempfile.gettempdir()) / 'aether-wac-rows.bin')
    parser.add_argument('--source-label', type=Path,
                        default=Path(tempfile.gettempdir()) / 'aether-wac-label.raw')
    parser.add_argument('--output', type=Path, default=ROOT / 'public/lunar')
    args = parser.parse_args()
    prepare(args.source_block, args.source_label, args.output)

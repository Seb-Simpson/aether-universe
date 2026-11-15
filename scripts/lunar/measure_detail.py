#!/usr/bin/env python3
"""Compare the actual measured fine grid with each coarser rendered mesh.
Offline analysis only, NumPy required. The renderer uses these exact triangle diagonals.
"""
import json
from pathlib import Path
import numpy as np
root=Path(__file__).resolve().parents[2]
m=json.loads((root/'public/lunar/manifest.json').read_text())
n=m['gridSize']
grid=np.fromfile(root/'public/lunar/heights.bin',dtype='<f4').reshape(n,n).astype(np.float64)
coords=np.linspace(-m['sizeMeters']/2,m['sizeMeters']/2,n)
x,z=np.meshgrid(coords,coords)
fine=grid-m['referenceElevation']-(m['radiusMeters']-np.sqrt(m['radiusMeters']**2-x*x-z*z))
results=[]
for level in range(m['maxLevel']+1):
    stride=2**(m['maxLevel']-level)
    coarse=fine[::stride,::stride]
    g=np.arange(n)/stride
    i=np.minimum(np.floor(g).astype(int),coarse.shape[0]-2)
    frac=g-i
    fx,fz=np.meshgrid(frac,frac)
    ix,iz=np.meshgrid(i,i)
    a,b,c,d=coarse[iz,ix],coarse[iz,ix+1],coarse[iz+1,ix],coarse[iz+1,ix+1]
    interpolated=np.where(fx+fz<=1,a+(b-a)*fx+(c-a)*fz,d+(c-d)*(1-fx)+(b-d)*(1-fz))
    error=fine-interpolated
    results.append({'level':level,'spacingMeters':m['sizeMeters']/(64*2**level),'nestedSamplesAcrossWholeRegion':int(coarse.size),'rmsHeightDifferenceMeters':round(float(np.sqrt(np.mean(error**2))),4),'maxAbsoluteHeightDifferenceMeters':round(float(np.max(np.abs(error))),4)})
report={'meaning':'Measured source relief omitted by each coarser triangular mesh, compared at the same canonical locations. This is LOD approximation error, not source-data accuracy. Whole-region sample counts are not resident runtime counts.','levels':results}
output=root/'docs/screenshots/002b/data-detail.json'
output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))

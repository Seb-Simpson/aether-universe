#!/usr/bin/env python3
"""Offline Moon colour-map derivatives; not an elevation source.
Credit Solar System Scope, CC BY 4.0. Requirements: Pillow, requests.
"""
import argparse
import hashlib
import tempfile
from pathlib import Path
import requests
from PIL import Image

URL = 'https://www.solarsystemscope.com/textures/download/8k_moon.jpg'
SHA256 = 'd1875bcec83588ca25e4802e576f6bb9f88b39e1e403cb41ff55867419c54796'
ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, default=Path(tempfile.gettempdir()) / 'aether-moon-source.jpg')
parser.add_argument('--output', type=Path, default=ROOT / 'public/lunar')
args = parser.parse_args()
if not args.source.exists():
    with requests.get(URL, timeout=(30,180), stream=True) as response:
        response.raise_for_status()
        payload = bytearray()
        for chunk in response.iter_content(1024*1024):
            payload.extend(chunk)
            if len(payload) > 40*1024**2:
                raise ValueError('Source exceeds expected bounded image size')
    if hashlib.sha256(payload).hexdigest() != SHA256:
        raise ValueError('Source changed; inspect and document before processing')
    args.source.write_bytes(payload)
if hashlib.sha256(args.source.read_bytes()).hexdigest() != SHA256:
    raise ValueError('Source image checksum mismatch')
image = Image.open(args.source).convert('RGB')
if image.size != (8192,4096):
    raise ValueError('Unexpected global map dimensions')
args.output.mkdir(parents=True,exist_ok=True)
for name, size, quality in [('moon.jpg',(8192,4096),90),('moon-4k.jpg',(4096,2048),87),('moon-2k.jpg',(2048,1024),85),('moon-thumb.jpg',(128,64),85)]:
    image.resize(size,Image.Resampling.LANCZOS).save(args.output/name,quality=quality,optimize=True)
print('Prepared licensed global colour derivatives; no height data inferred.')

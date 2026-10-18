#!/usr/bin/env sh
# Web uygulamasını derleyip Python paketine koyar, sonra wheel + sdist üretir.
set -e
cd "$(dirname "$0")/.."
npm ci --no-audit --no-fund
npm run build
rm -rf osintcase/static
mkdir -p osintcase/static
cp -r dist/. osintcase/static/
python3 -m pip install --quiet --upgrade build
python3 -m build --outdir pydist
echo "pydist/ içindeki osintcase-*.whl dosyası hazır. Yüklemek için: twine upload pydist/*"

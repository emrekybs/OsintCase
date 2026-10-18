#!/usr/bin/env sh
# Builds the Debian package (amd64) into pydist/.
# Needs: node, python3, pip, dpkg-deb.  Run after `npm run build`.
set -e
cd "$(dirname "$0")/.."
VERSION=$(python3 -c "import re;print(re.search(r'__version__ = \"([^\"]+)\"',open('osintcase/__init__.py').read()).group(1))")
WORK=$(mktemp -d)
R="$WORK/root"
PLAT="--platform manylinux_2_28_x86_64 --platform manylinux2014_x86_64 --platform manylinux_2_17_x86_64"

echo "==> Building the web app"
npm run build
rm -rf osintcase/static && mkdir -p osintcase/static && cp -r dist/. osintcase/static/

echo "==> Collecting Python dependencies"
mkdir -p "$R/opt/osintcase/lib" "$R/usr/bin" "$R/usr/share/applications" \
         "$R/usr/share/icons/hicolor/512x512/apps" "$R/usr/share/icons/hicolor/256x256/apps" \
         "$R/usr/share/doc/osintcase" "$R/DEBIAN"
python3 -m pip wheel --no-deps -q -w "$WORK/wheels" pywebview proxy_tools bottle QtPy packaging typing_extensions
python3 -m pip download --no-deps --only-binary=:all: $PLAT --python-version 3.10 --implementation cp \
        -q -d "$WORK/wheels" PyQt6 PyQt6-Qt6 PyQt6-WebEngine PyQt6-WebEngine-Qt6
for v in 3.9 3.10 3.11 3.12 3.13 3.14; do
  python3 -m pip download --no-deps --only-binary=:all: $PLAT --python-version $v --implementation cp \
          -q -d "$WORK/sip/$v" PyQt6-sip || true
done
for w in "$WORK"/wheels/*.whl; do unzip -q -o "$w" -d "$R/opt/osintcase/lib"; done
for d in "$WORK"/sip/*; do
  [ -n "$(ls "$d"/*.whl 2>/dev/null)" ] || continue
  mkdir -p "$R/opt/osintcase/lib-sip/$(basename "$d")"
  unzip -q -o "$d"/*.whl -d "$R/opt/osintcase/lib-sip/$(basename "$d")"
done
rm -rf "$R/opt/osintcase/lib/bin" \
       "$R/opt/osintcase/lib/PyQt6/Qt6/qml" "$R/opt/osintcase/lib/PyQt6/Qt6/qsci"
find "$R/opt/osintcase/lib/PyQt6/Qt6/translations" -maxdepth 1 -name '*.qm' -delete 2>/dev/null || true
find "$R/opt/osintcase/lib" -name RECORD -path '*.dist-info*' -delete

echo "==> Adding OSINT Case"
cp -r osintcase "$R/opt/osintcase/osintcase"
rm -rf "$R/opt/osintcase/osintcase/__pycache__" "$R/opt/osintcase/osintcase/_vendor"
cp osintcase/assets/icon.png     "$R/usr/share/icons/hicolor/512x512/apps/osintcase.png"
cp osintcase/assets/icon-256.png "$R/usr/share/icons/hicolor/256x256/apps/osintcase.png"
cp packaging/deb/osintcase       "$R/usr/bin/osintcase"
cp packaging/deb/osintcase.desktop "$R/usr/share/applications/osintcase.desktop"
cp packaging/deb/copyright       "$R/usr/share/doc/osintcase/copyright"
chmod 755 "$R/usr/bin/osintcase"

sed "s/@VERSION@/$VERSION/; s/@SIZE@/$(du -sk --exclude=DEBIAN "$R" | cut -f1)/" \
    packaging/deb/control > "$R/DEBIAN/control"
find "$R" -type d -exec chmod 755 {} +
find "$R/opt" -type f -exec chmod go+r {} +

mkdir -p pydist
dpkg-deb -Zxz -z6 --root-owner-group --build "$R" "pydist/osintcase_${VERSION}_amd64.deb"
rm -rf "$WORK"
ls -la "pydist/osintcase_${VERSION}_amd64.deb"
echo "Install with: sudo apt install ./pydist/osintcase_${VERSION}_amd64.deb"

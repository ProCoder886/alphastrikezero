"""Dev helper: replace text in a source file.

python tools/splice.py <file> --head <marker> <newfile>      replace everything before <marker> with the contents of <newfile>
python tools/splice.py <file> --edits <editsfile.json>       apply [{"a": old, "b": new, "n": count?}] (each old text must exist)
"""
import sys, json, io

path = sys.argv[1]
src = io.open(path, encoding='utf-8').read()
if sys.argv[2] == '--head':
    marker, new = sys.argv[3], io.open(sys.argv[4], encoding='utf-8').read()
    i = src.index(marker)
    src = new + src[i:]
else:
    edits = json.load(io.open(sys.argv[3], encoding='utf-8'))
    for k, e in enumerate(edits):
        if src.count(e['a']) < 1:
            sys.exit('edit %d not found: %r' % (k, e['a'][:90]))
        src = src.replace(e['a'], e['b'], e.get('n', 1))
io.open(path, 'w', encoding='utf-8', newline='\n').write(src)
print('ok', path)

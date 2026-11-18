"""Build assets/style.css from assets/style.src.css: sizes above 2px become calc(N * var(--u))."""
import re, os
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, 'assets/style.src.css')).read()
def conv(line):
    if line.lstrip().startswith('@media'): return line
    return re.sub(r'(?<![\w.#-])(-?\d*\.?\d+)px', lambda m: m.group(0) if abs(float(m.group(1))) <= 2 else f'calc({m.group(1)} * var(--u))', line)
out = '\n'.join(conv(l) for l in src.split('\n'))
open(os.path.join(here, 'assets/style.css'), 'w').write('/* GENERATED from style.src.css by build_css.py — do not edit */\n' + out)
print('ok', out.count('var(--u)'))

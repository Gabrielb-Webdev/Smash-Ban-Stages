#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Crea los componentes de Santa Fe copiando los de INC."""
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COMPONENTS = os.path.join(BASE, 'src', 'components')

# ── TabletControlSantaFe ────────────────────────────────────────────────────
with open(os.path.join(COMPONENTS, 'TabletControlInc.jsx'), 'r', encoding='utf-8') as f:
    tablet = f.read()

tablet = tablet.replace(
    '// TABLET CONTROL - INC\n// Archivo exclusivo para INC. No tocar para otras comunidades.',
    '// TABLET CONTROL - SANTA FE\n// Archivo exclusivo para Santa Fe. No tocar para otras comunidades.'
)
tablet = tablet.replace(
    '// ── Stages hardcodeados para Game 1 de INC ─────────────────',
    '// ── Stages hardcodeados para Game 1 de Santa Fe ─────────────────'
)
tablet = tablet.replace('const GAME1_STAGES_INC', 'const GAME1_STAGES_SANTAFE')
tablet = tablet.replace('GAME1_STAGES_INC', 'GAME1_STAGES_SANTAFE')
tablet = tablet.replace(
    '// ── Fondo INC: gradiente oscuro crimson ─────────────────────\n'
    "const INC_BG = 'linear-gradient(160deg, #0c0102 0%, #260206 50%, #3d0508 100%)'",
    '// ── Fondo Santa Fe: gradiente oscuro navy/cyan ─────────────────────\n'
    "const SANTAFE_BG = 'linear-gradient(160deg, #010810 0%, #031830 50%, #04284a 100%)'"
)
tablet = tablet.replace('INC_BG', 'SANTAFE_BG')

# Logo
tablet = tablet.replace(
    'src="/images/inc.png" alt="INC"',
    'src="/images/Smash_Santa_Fe.png" alt="Santa Fe"'
)

# Nombre de función
tablet = tablet.replace(
    'export default function TabletControlInc(',
    'export default function TabletControlSantaFe('
)

out_tablet = os.path.join(COMPONENTS, 'TabletControlSantaFe.jsx')
with open(out_tablet, 'w', encoding='utf-8') as f:
    f.write(tablet)
print(f'Creado: {out_tablet} ({tablet.count(chr(10))} líneas)')

# ── StreamOverlaySantaFe ────────────────────────────────────────────────────
with open(os.path.join(COMPONENTS, 'StreamOverlayInc.jsx'), 'r', encoding='utf-8') as f:
    stream = f.read()

stream = stream.replace(
    '// STREAM OVERLAY - INC\n// Archivo exclusivo para INC. No tocar para otras comunidades.',
    '// STREAM OVERLAY - SANTA FE\n// Archivo exclusivo para Santa Fe. No tocar para otras comunidades.'
)
# Footer color: crimson → navy/cyan
stream = stream.replace(
    "background: 'linear-gradient(135deg, #1a0000 0%, #450808 50%, #7a1010 100%)',",
    "background: 'linear-gradient(135deg, #010c1c 0%, #053060 50%, #0a4a88 100%)',"
)
stream = stream.replace(
    "boxShadow: '0 -4px 24px rgba(220,38,38,0.35), 0 -1px 0 rgba(220,38,38,0.5)',",
    "boxShadow: '0 -4px 24px rgba(10,74,136,0.4), 0 -1px 0 rgba(10,120,200,0.5)',"
)
stream = stream.replace(
    'export default function StreamOverlayInc(',
    'export default function StreamOverlaySantaFe('
)

out_stream = os.path.join(COMPONENTS, 'StreamOverlaySantaFe.jsx')
with open(out_stream, 'w', encoding='utf-8') as f:
    f.write(stream)
print(f'Creado: {out_stream} ({stream.count(chr(10))} líneas)')

print('Todo OK')

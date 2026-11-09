from pathlib import Path
root=Path(__file__).parent/'assets'

def base_scene(kind=1,hero=False):
  skies=[('#b4cdc8','#e3e5d5'),('#b0c8c6','#e4ded1'),('#b2d0dd','#e6e8dd'),('#88c6d4','#dfe6dc'),('#b6c9c4','#e8dfd2'),('#cfcebf','#ece5d6')]
  a,b=skies[(kind-1)%6]
  w,h=(1000,1000) if hero else (900,630)
  horizon=int(h*.73)
  parts=[f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient>
  <linearGradient id="glass" x1="0" y1="0" x2=".9" y2="1"><stop stop-color="#9bb7b3"/><stop offset=".4" stop-color="#486b70"/><stop offset="1" stop-color="#304e54"/></linearGradient>
  <linearGradient id="stone"><stop stop-color="#f4eee1"/><stop offset="1" stop-color="#b9ad9c"/></linearGradient>
  <linearGradient id="pool" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a4cbc9"/><stop offset="1" stop-color="#4e929e"/></linearGradient>
  <linearGradient id="lawn" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#819b83"/><stop offset="1" stop-color="#4c665b"/></linearGradient>
  <filter id="shade"><feDropShadow dx="0" dy="19" stdDeviation="20" flood-color="#26433c" flood-opacity=".21"/></filter>
  <filter id="blur"><feGaussianBlur stdDeviation="6"/></filter></defs>
  <rect width="{w}" height="{h}" fill="url(#sky)"/>
  <circle cx="{int(w*.80)}" cy="{int(h*.18)}" r="{int(w*.16)}" fill="#fff7dd" opacity=".38"/>
  <path d="M0 {horizon-80} Q{w//4} {horizon-135} {w//2} {horizon-78} T{w} {horizon-85}V{h}H0Z" fill="#9cab9b" opacity=".4"/>
  <path d="M0 {horizon+13}Q{w//2} {horizon-15} {w} {horizon+17}V{h}H0Z" fill="url(#lawn)"/>
  <rect x="0" y="{horizon+65}" width="{w}" height="{h-horizon-65}" fill="#678575" opacity=".7"/>''']
  if kind in (1,2,5) or hero:
    x,y=100,int(h*.30); ww=w-175; hh=int(h*.43)
    # building main
    parts.append(f'''<g filter="url(#shade)"><rect x="{x+18}" y="{y+85}" width="{ww}" height="{hh-35}" fill="url(#stone)"/><rect x="{x+40}" y="{y-9}" width="{int(ww*.88)}" height="{int(hh*.43)}" fill="#d5cbbc"/>
      <path d="M{x+5} {y-15}h{ww-12}l23 28H{x-15}Z" fill="#ede5d8"/><rect x="{x-6}" y="{y+int(hh*.38)}" width="{ww+25}" height="19" fill="#ede7d9"/>
      <rect x="{x+65}" y="{y+6}" width="{int(ww*.37)}" height="{int(hh*.32)}" fill="url(#glass)"/>
      <rect x="{x+int(ww*.49)}" y="{y+6}" width="{int(ww*.36)}" height="{int(hh*.32)}" fill="url(#glass)"/>
      <rect x="{x+50}" y="{y+int(hh*.43)}" width="{int(ww*.42)}" height="{int(hh*.49)}" fill="url(#glass)"/>
      <rect x="{x+int(ww*.56)}" y="{y+int(hh*.43)}" width="{int(ww*.29)}" height="{int(hh*.49)}" fill="url(#glass)"/>
      <path d="M{x+int(ww*.23)} {y+6}v{int(hh*.32)}M{x+int(ww*.67)} {y+6}v{int(hh*.32)}M{x+int(ww*.28)} {y+int(hh*.43)}v{int(hh*.49)}M{x+int(ww*.71)} {y+int(hh*.43)}v{int(hh*.49)}" stroke="#d2d2c8" stroke-width="7"/>
      <rect x="{x+int(ww*.46)}" y="{y+int(hh*.40)}" width="{int(ww*.085)}" height="{int(hh*.59)}" fill="#998d7b"/>
      <path d="M{x+65} {y+13}l-55 53m133-42-74 74m260-80-92 95m195-88-92 100" stroke="#d0e9e2" opacity=".18" stroke-width="9"/>
    </g>''')
    if kind==2:
      parts.append(f'<path d="M{x+int(ww*.83)} {y-15}v{-int(hh*.13)}h{-int(ww*.26)}" stroke="#afa390" stroke-width="18" fill="none"/>')
  elif kind in (3,6):
    y=int(h*.17)
    starts=([160,395,600] if kind==3 else [130,355,570])
    for ix,xx in enumerate(starts):
      ww=[220,255,160][ix]; hh=[int(h*.53),int(h*.69),int(h*.46)][ix]
      y1=y+(int(h*.7)-hh)
      parts.append(f'<g filter="url(#shade)"><rect x="{xx}" y="{y1}" width="{ww}" height="{hh}" fill="{["#d7d0c4","#ece5d6","#c8c4b8"][ix]}"/><rect x="{xx+7}" y="{y1+10}" width="{ww-14}" height="{hh-22}" fill="url(#glass)"/></g>')
      for row in range(5 if ix==1 else 4):
       for col in range(3):
        xx1=xx+14+col*(ww-21)/3; yy1=y1+19+row*(hh-35)/(5 if ix==1 else 4)
        parts.append(f'<rect x="{xx1:.0f}" y="{yy1:.0f}" width="{(ww-37)/3:.0f}" height="{(hh-80)/(5 if ix==1 else 4):.0f}" fill="{["#9bb7b5","#5b8b8e","#b0c7bd"][col]}" opacity=".52"/>')
      parts.append(f'<rect x="{xx-10}" y="{y1-9}" width="{ww+20}" height="13" fill="#f1eee4"/>')
  else:
    # beachfront low buildings
    parts.append(f'''<path d="M0 {int(h*.7)}q200-22 470-6t{w} 14V{h}H0Z" fill="#b7b08e"/><path d="M0 {int(h*.82)}Q{w//3} {int(h*.77)} {w} {int(h*.80)}V{h}H0Z" fill="#82b5b1"/>
   <g filter="url(#shade)"><rect x="140" y="192" width="590" height="290" fill="#e8e3d5"/><rect x="105" y="180" width="680" height="20" fill="#f7efdf"/>
     <rect x="178" y="217" width="190" height="210" fill="url(#glass)"/><rect x="394" y="217" width="140" height="210" fill="url(#glass)"/><rect x="560" y="217" width="130" height="210" fill="url(#glass)"/>
     <path d="M140 323h590" stroke="#ece2d4" stroke-width="17"/><path d="M270 216v215M465 216v215M625 216v215" stroke="#eee4d8" stroke-width="9"/></g>''')
  # pool/forecourt
  if kind not in (3,6):
    parts.append(f'''<path d="M{int(w*.24)} {int(h*.77)} L{int(w*.92)} {int(h*.77)} L{w+30} {h+20}L{int(w*.08)} {h+20}Z" fill="#e5e1d5"/>
      <path d="M{int(w*.26)} {int(h*.80)}L{int(w*.90)} {int(h*.80)} L{int(w*.99)} {h}L{int(w*.14)} {h}Z" fill="url(#pool)"/>
      <path d="M{int(w*.27)} {int(h*.86)}L{int(w*.93)} {int(h*.87)}M{int(w*.23)} {int(h*.91)}L{int(w*.95)} {int(h*.92)}" stroke="#efffff" stroke-width="4" opacity=".3"/>''')
  # plants
  for tx,scale in [(int(w*.04),1.15),(int(w*.88),.74)]:
    cy=int(h*.77)
    parts.append(f'<g transform="translate({tx},{cy}) scale({scale})"><path d="M0 90 Q-10 10 5-90" stroke="#655647" stroke-width="13" fill="none"/>')
    for dx,dy in [(-90,-75),(-70,-115),(-20,-125),(45,-124),(85,-96),(75,-61),(20,-72),(-37,-92)]:
      parts.append(f'<path d="M5 -89Q{dx//2} {dy-35} {dx} {dy}" fill="none" stroke="#467365" stroke-width="13" stroke-linecap="round"/>')
    parts.append('</g>')
  # foliage foreground soft
  for xx in range(-45,w+100,95):
    cy=int(h*.87)+(xx%4)*9
    parts.append(f'<ellipse cx="{xx}" cy="{cy}" rx="55" ry="28" fill="#426954" opacity=".67"/>')
  parts.append(f'<path d="M0 {h-14}Q{w//2} {h-33} {w} {h-5}V{h}H0Z" fill="#d0bd97" opacity=".8"/>')
  parts.append('</svg>')
  return ''.join(parts)

for k in range(1,7):
 (root/f'property-{k}.svg').write_text(base_scene(k),encoding='utf-8')
(root/'hero.svg').write_text(base_scene(2,True),encoding='utf-8')
print('Generated 7 local architectural demo illustrations')

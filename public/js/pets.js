'use strict';

// Premium ev heyvanları: emoji deyil, SVG illüstrasiya. Hər heyvan təsadüfi vaxtlarda öz hərəkətini edir
// (göz qırpır, quyruq bulayır, qulaq oynadır, tullanır, yatır və s.).
// PetArt.html(id) -> <span class="vil-pet">…</span>; hərəkətləri global taymer idarə edir (CSS: .act-* siniflər).
const PetArt = (() => {
  const eye = (x, y, r = 1.5) => `<g class="pe"><circle cx="${x}" cy="${y}" r="${r}" fill="#1f2937"/><circle cx="${x + 0.5}" cy="${y - 0.5}" r="${r * 0.32}" fill="#fff"/></g>`;
  const shadow = '<ellipse cx="20" cy="34.6" rx="11.5" ry="1.7" fill="rgba(0,0,0,.2)"/>';
  const zzz = '<g class="pz"><text x="27" y="2" font-size="6" font-weight="800" fill="#6366f1" font-family="system-ui,sans-serif">z</text><text x="31" y="-2" font-size="4.6" font-weight="800" fill="#818cf8" font-family="system-ui,sans-serif">z</text></g>';
  const tail = (d, ox, oy, extra) => `<g class="pt" style="transform-box:view-box;transform-origin:${ox}px ${oy}px">${d}</g>${extra || ''}`;

  const SVG = {
    pet_dog: () => `${shadow}
      ${tail('<path d="M29.4 28 Q38 25 35.4 15.4" stroke="#b9772f" stroke-width="3.6" fill="none" stroke-linecap="round"/>', 29, 28)}
      <ellipse cx="20" cy="27.4" rx="9.6" ry="7.6" fill="#dba15c"/><ellipse cx="20" cy="29.4" rx="5.6" ry="5" fill="#fff1dc"/>
      <ellipse cx="14.4" cy="33" rx="3.3" ry="2" fill="#f0c48f"/><ellipse cx="25.6" cy="33" rx="3.3" ry="2" fill="#f0c48f"/>
      <g class="pb"><circle cx="20" cy="14.6" r="9.6" fill="#e5ab66"/>
      <g class="pr" style="transform-box:fill-box;transform-origin:50% 0"><path d="M12.4 7.4 Q6.4 8.6 7.6 19.6 Q13.2 18 14.6 11Z" fill="#a9672b"/></g>
      <g class="pr" style="transform-box:fill-box;transform-origin:50% 0"><path d="M27.6 7.4 Q33.6 8.6 32.4 19.6 Q26.8 18 25.4 11Z" fill="#a9672b"/></g>
      <ellipse cx="20" cy="18.4" rx="6.2" ry="4.8" fill="#fff1dc"/>
      <circle cx="15.6" cy="10.8" r=".9" fill="#fff1dc"/><circle cx="24.4" cy="10.8" r=".9" fill="#fff1dc"/>
      ${eye(15.8, 13.8)}${eye(24.2, 13.8)}
      <ellipse cx="20" cy="16.6" rx="2.1" ry="1.45" fill="#1f2937"/>
      <path d="M20 18 V19.4 M17.4 19.6 Q20 21.4 22.6 19.6" stroke="#7c3a2a" stroke-width="1.1" fill="none" stroke-linecap="round"/>
      <path class="pk" d="M18.8 20.2 Q20 24.4 21.8 20.2Z" fill="#f472b6"/></g>${zzz}`,

    pet_cat: () => `${shadow}
      ${tail('<path d="M28.6 29.6 Q39 30 36.4 19.6 Q35.6 16.4 33.2 17.6" stroke="#8791a2" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M36.4 22 H38.6 M35.8 25.4 H38" stroke="#5b6372" stroke-width="1" stroke-linecap="round"/>', 28.6, 29.6)}
      <ellipse cx="20" cy="27.6" rx="9" ry="7.4" fill="#9aa3b2"/><ellipse cx="20" cy="29.6" rx="5" ry="4.8" fill="#e8ecf2"/>
      <path d="M12 24 L14 27.4M28 24 L26 27.4" stroke="#7c8596" stroke-width="1.2" stroke-linecap="round"/>
      <ellipse cx="14.8" cy="33" rx="3.1" ry="1.9" fill="#e8ecf2"/><ellipse cx="25.2" cy="33" rx="3.1" ry="1.9" fill="#e8ecf2"/>
      <g class="pb"><circle cx="20" cy="14.4" r="9" fill="#9aa3b2"/>
      <g class="pr" style="transform-box:fill-box;transform-origin:50% 100%"><path d="M11.4 10.4 L10.6 1.2 L18 6.2Z" fill="#8791a2"/><path d="M12.4 8.6 L12.2 4.2 L15.6 6.4Z" fill="#f9a8d4"/></g>
      <g class="pr" style="transform-box:fill-box;transform-origin:50% 100%"><path d="M28.6 10.4 L29.4 1.2 L22 6.2Z" fill="#8791a2"/><path d="M27.6 8.6 L27.8 4.2 L24.4 6.4Z" fill="#f9a8d4"/></g>
      <path d="M20 6.6 V9.6 M16.6 7.4 L17.4 9.8 M23.4 7.4 L22.6 9.8" stroke="#6b7384" stroke-width="1.1" stroke-linecap="round"/>
      <ellipse cx="20" cy="17.6" rx="5.2" ry="3.8" fill="#e8ecf2"/>
      <g class="pe"><ellipse cx="15.6" cy="13.6" rx="1.9" ry="2.2" fill="#a7f3d0"/><ellipse cx="15.6" cy="13.6" rx=".7" ry="1.7" fill="#1f2937"/></g>
      <g class="pe"><ellipse cx="24.4" cy="13.6" rx="1.9" ry="2.2" fill="#a7f3d0"/><ellipse cx="24.4" cy="13.6" rx=".7" ry="1.7" fill="#1f2937"/></g>
      <path d="M18.8 16.2 H21.2 L20 17.6Z" fill="#f472b6"/><path d="M20 17.6 V18.6 M17.8 19 Q20 20.4 22.2 19" stroke="#6b7384" stroke-width="1" fill="none" stroke-linecap="round"/>
      <g stroke="#f1f5f9" stroke-width=".6" stroke-linecap="round"><path d="M14 17.4 L8.6 16.6M14 18.6 L8.8 19.6M26 17.4 L31.4 16.6M26 18.6 L31.2 19.6"/></g></g>${zzz}`,

    pet_chick: () => `${shadow}
      <path d="M16.4 33.4 V35 M14.6 35 H18.2 M23.6 33.4 V35 M21.8 35 H25.4" stroke="#fb923c" stroke-width="1.3" stroke-linecap="round"/>
      <g class="pb"><ellipse cx="20" cy="23" rx="12.2" ry="11.6" fill="#fde047"/><ellipse cx="20" cy="27" rx="7.4" ry="6.2" fill="#fef08a"/>
      <path d="M18 11.8 Q16.6 6 19 8.4 M20.6 11.2 Q20.8 4.8 23 8.2 M23.4 11.8 Q25.6 7.4 25.6 11.4" stroke="#f5c400" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      ${tail('<ellipse cx="8.8" cy="25" rx="3.2" ry="5.2" fill="#facc15" transform="rotate(14 8.8 25)"/>', 10, 20)}
      ${tail('<ellipse cx="31.2" cy="25" rx="3.2" ry="5.2" fill="#facc15" transform="rotate(-14 31.2 25)"/>', 30, 20)}
      <circle cx="12.6" cy="23" r="2" fill="#fda4af" opacity=".7"/><circle cx="27.4" cy="23" r="2" fill="#fda4af" opacity=".7"/>
      ${eye(15.2, 19.4, 1.7)}${eye(24.8, 19.4, 1.7)}
      <path d="M17.2 22.4 L22.8 22.4 L20 26.4Z" fill="#fb923c" stroke="#ea7a1c" stroke-width=".5" stroke-linejoin="round"/></g>${zzz}`,

    pet_bunny: () => `${shadow}
      ${tail('<circle cx="29.6" cy="30.6" r="3.5" fill="#fff" stroke="#e5e7eb" stroke-width=".6"/>', 29.6, 30.6)}
      <ellipse cx="20" cy="28" rx="8.6" ry="7" fill="#f8fafc"/><ellipse cx="20" cy="30" rx="4.6" ry="4.4" fill="#fff"/>
      <ellipse cx="14.6" cy="33.2" rx="3.2" ry="1.9" fill="#f1f5f9"/><ellipse cx="25.4" cy="33.2" rx="3.2" ry="1.9" fill="#f1f5f9"/>
      <g class="pb"><g class="pr" style="transform-box:fill-box;transform-origin:50% 100%"><ellipse cx="14.4" cy="3.6" rx="3.2" ry="8.6" fill="#f8fafc" transform="rotate(-8 14.4 3.6)"/><ellipse cx="14.4" cy="4.4" rx="1.5" ry="6.2" fill="#fbcfe8" transform="rotate(-8 14.4 4.4)"/></g>
      <g class="pr" style="transform-box:fill-box;transform-origin:50% 100%"><ellipse cx="25.6" cy="3.6" rx="3.2" ry="8.6" fill="#f8fafc" transform="rotate(8 25.6 3.6)"/><ellipse cx="25.6" cy="4.4" rx="1.5" ry="6.2" fill="#fbcfe8" transform="rotate(8 25.6 4.4)"/></g>
      <circle cx="20" cy="17.2" r="8.4" fill="#fff" stroke="#eef2f7" stroke-width=".6"/>
      <circle cx="13.6" cy="19.4" r="2" fill="#fbcfe8" opacity=".8"/><circle cx="26.4" cy="19.4" r="2" fill="#fbcfe8" opacity=".8"/>
      ${eye(16, 16, 1.5)}${eye(24, 16, 1.5)}
      <path d="M18.8 18.4 H21.2 L20 19.8Z" fill="#f472b6"/><path d="M20 19.8 V21 M18 21.4 Q20 22.8 22 21.4" stroke="#9ca3af" stroke-width=".9" fill="none" stroke-linecap="round"/></g>${zzz}`,

    pet_fox: () => `${shadow}
      ${tail('<path d="M27.6 31.6 Q42 31 38.4 15.4 Q33.6 20.6 26.6 25Z" fill="#f97316"/><path d="M38.4 15.4 Q41.6 21 39.6 26 Q36.6 24 35.6 20.4Z" fill="#fff7ed"/>', 27, 30)}
      <ellipse cx="20" cy="29.4" rx="7.6" ry="5.6" fill="#f97316"/><ellipse cx="20" cy="30.4" rx="4" ry="4.4" fill="#fff7ed"/>
      <rect x="12.6" y="31" width="4.4" height="3.8" rx="2" fill="#3b2314"/><rect x="23" y="31" width="4.4" height="3.8" rx="2" fill="#3b2314"/>
      <g class="pb"><g class="pr" style="transform-box:fill-box;transform-origin:50% 100%"><path d="M8.6 15 Q6.6 6 8.6 2.4 L15.6 9.4Z" fill="#f97316"/><path d="M8.7 4.2 L9.8 2.6 L12 5.2Z" fill="#3b2314"/></g>
      <g class="pr" style="transform-box:fill-box;transform-origin:50% 100%"><path d="M31.4 15 Q33.4 6 31.4 2.4 L24.4 9.4Z" fill="#f97316"/><path d="M31.3 4.2 L30.2 2.6 L28 5.2Z" fill="#3b2314"/></g>
      <path d="M8 15 Q8 8.4 20 8.4 Q32 8.4 32 15 Q32 22 20 26 Q8 22 8 15Z" fill="#f97316"/>
      <path d="M8.4 16.6 Q15 18 20 26 Q25 18 31.6 16.6 Q28 24 20 26.6 Q12 24 8.4 16.6Z" fill="#fff7ed"/>
      ${eye(15, 15, 1.4)}${eye(25, 15, 1.4)}
      <path d="M12.8 13.8 L16.6 12.6M27.2 13.8 L23.4 12.6" stroke="#9a3412" stroke-width=".9" stroke-linecap="round"/>
      <ellipse cx="20" cy="22.8" rx="1.7" ry="1.2" fill="#1f2937"/><path d="M20 24 V25 M18.2 25.2 Q20 26.4 21.8 25.2" stroke="#7c2d12" stroke-width=".8" fill="none" stroke-linecap="round"/></g>${zzz}`,

    pet_ghost: () => `<ellipse cx="20" cy="35" rx="9" ry="1.5" fill="rgba(0,0,0,.14)"/>
      <g class="pb">
      <path d="M8.6 33 V16 Q8.6 3.4 20 3.4 Q31.4 3.4 31.4 16 V33 Q28.6 30.4 26 33 Q23.4 30.4 20.6 33 Q18 30.4 15.2 33 Q12.4 30.4 8.6 33Z" fill="#f8fafc"/>
      <path d="M8.6 20 Q8.6 30 14 31.4 Q10.2 28 10.4 18Z" fill="#dbe4f0"/>
      <path d="M12.4 8 Q15 5 18.4 5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".9"/>
      ${tail('<ellipse cx="7" cy="22" rx="2.6" ry="4" fill="#f8fafc" transform="rotate(22 7 22)"/>', 9, 19)}
      ${tail('<ellipse cx="33" cy="22" rx="2.6" ry="4" fill="#f8fafc" transform="rotate(-22 33 22)"/>', 31, 19)}
      <g class="pe"><ellipse cx="15.6" cy="15.6" rx="2" ry="2.8" fill="#1f2937"/><circle cx="16.2" cy="14.6" r=".7" fill="#fff"/></g>
      <g class="pe"><ellipse cx="24.4" cy="15.6" rx="2" ry="2.8" fill="#1f2937"/><circle cx="25" cy="14.6" r=".7" fill="#fff"/></g>
      <circle cx="12.2" cy="20.2" r="2" fill="#fda4af" opacity=".7"/><circle cx="27.8" cy="20.2" r="2" fill="#fda4af" opacity=".7"/>
      <ellipse class="pm" cx="20" cy="21" rx="2" ry="2.4" fill="#475569"/></g>`,

    pet_panda: () => `${shadow}
      <ellipse cx="20" cy="27.4" rx="9.4" ry="7.6" fill="#fafafa"/>
      <ellipse cx="11" cy="26" rx="3.2" ry="5.4" fill="#1f2937" transform="rotate(14 11 26)"/><ellipse cx="29" cy="26" rx="3.2" ry="5.4" fill="#1f2937" transform="rotate(-14 29 26)"/>
      <ellipse cx="14.6" cy="33.2" rx="3.6" ry="2.2" fill="#1f2937"/><ellipse cx="25.4" cy="33.2" rx="3.6" ry="2.2" fill="#1f2937"/>
      <g class="pbm" style="transform-box:view-box;transform-origin:31px 28px"><rect x="29.6" y="18" width="3" height="14" rx="1.2" fill="#65a30d"/><path d="M29.6 22.6 H32.6 M29.6 27.4 H32.6" stroke="#3f6212" stroke-width=".8"/><path d="M32.4 20 Q36.6 18 37 21.6 Q34 21.8 32.4 20Z" fill="#84cc16"/></g>
      <g class="pb"><circle cx="12.4" cy="6.6" r="3.4" fill="#1f2937"/><circle cx="27.6" cy="6.6" r="3.4" fill="#1f2937"/>
      <g class="pr" style="transform-box:fill-box;transform-origin:50% 100%"><circle cx="12.4" cy="6.6" r="3.4" fill="#1f2937"/></g>
      <circle cx="20" cy="14.4" r="9.4" fill="#fafafa"/>
      <ellipse cx="15" cy="14.4" rx="2.8" ry="3.6" fill="#1f2937" transform="rotate(18 15 14.4)"/><ellipse cx="25" cy="14.4" rx="2.8" ry="3.6" fill="#1f2937" transform="rotate(-18 25 14.4)"/>
      <g class="pe"><circle cx="15.2" cy="14" r="1.35" fill="#fff"/><circle cx="15.4" cy="14.1" r=".7" fill="#111827"/></g>
      <g class="pe"><circle cx="24.8" cy="14" r="1.35" fill="#fff"/><circle cx="24.6" cy="14.1" r=".7" fill="#111827"/></g>
      <ellipse cx="20" cy="18" rx="2" ry="1.4" fill="#1f2937"/><path d="M20 19.2 V20.4 M17.8 20.8 Q20 22.4 22.2 20.8" stroke="#1f2937" stroke-width=".9" fill="none" stroke-linecap="round"/></g>${zzz}`,

    pet_dragon: () => `${shadow}
      ${tail('<path d="M27.4 31 Q39 33 38.4 23 L35.4 25.8 L36.2 21.8 Q34 28 28 28.4Z" fill="#4ade80"/><path d="M38.4 23 L40 19.6 L36.4 21Z" fill="#fde68a"/>', 27, 30)}
      <g class="pw" style="transform-box:view-box;transform-origin:12px 22px"><path d="M12 22 Q-1 15 2.6 5.4 Q7.4 11.4 14 15.4Z" fill="#22c55e"/><path d="M12 21 Q5 15 3.4 8.4M12.6 19.6 Q8 16 6 11" stroke="#15803d" stroke-width=".7" fill="none"/></g>
      <g class="pw" style="transform-box:view-box;transform-origin:28px 22px"><path d="M28 22 Q41 15 37.4 5.4 Q32.6 11.4 26 15.4Z" fill="#22c55e"/><path d="M28 21 Q35 15 36.6 8.4M27.4 19.6 Q32 16 34 11" stroke="#15803d" stroke-width=".7" fill="none"/></g>
      <ellipse cx="20" cy="27.4" rx="9.2" ry="7.4" fill="#4ade80"/><ellipse cx="20" cy="29" rx="5.4" ry="5.6" fill="#fef9c3"/>
      <path d="M16 26 H24 M16.6 28.8 H23.4 M17.6 31.4 H22.4" stroke="#fde68a" stroke-width=".9" stroke-linecap="round"/>
      <ellipse cx="14.6" cy="33.2" rx="3.4" ry="2" fill="#22c55e"/><ellipse cx="25.4" cy="33.2" rx="3.4" ry="2" fill="#22c55e"/>
      <g class="pb"><path d="M13 9 L11.6 2.4 L17 6.4Z" fill="#fde68a"/><path d="M27 9 L28.4 2.4 L23 6.4Z" fill="#fde68a"/>
      <circle cx="20" cy="14.2" r="8.8" fill="#4ade80"/><ellipse cx="20" cy="18.4" rx="5.6" ry="3.8" fill="#86efac"/>
      <circle cx="18.2" cy="18" r=".7" fill="#166534"/><circle cx="21.8" cy="18" r=".7" fill="#166534"/>
      <g class="pe"><circle cx="15.4" cy="13" r="2.2" fill="#fef08a"/><ellipse cx="15.5" cy="13" rx=".8" ry="1.7" fill="#1f2937"/></g>
      <g class="pe"><circle cx="24.6" cy="13" r="2.2" fill="#fef08a"/><ellipse cx="24.5" cy="13" rx=".8" ry="1.7" fill="#1f2937"/></g>
      <path d="M17.6 20.4 Q20 21.8 22.4 20.4" stroke="#166534" stroke-width=".9" fill="none" stroke-linecap="round"/>
      <g class="pf" style="transform-box:view-box;transform-origin:20px 20px"><path d="M17 21 Q20 31 23 21 Q20 24 17 21Z" fill="#f97316"/><path d="M18.4 21.4 Q20 27.6 21.6 21.4Z" fill="#fde047"/></g></g>${zzz}`,

    pet_unicorn: () => `${shadow}
      ${tail('<path d="M27.6 31 Q39 31 37 20 Q35 25 31 25 Q33 28 27 28Z" fill="#a78bfa"/><path d="M37 20 Q34 24 31 25 Q33.6 24 35.4 21Z" fill="#f472b6"/><path d="M36.4 25 Q35 29 29 29.4 Q34 29 36.4 25Z" fill="#60a5fa"/>', 27, 29)}
      <ellipse cx="20" cy="29" rx="8.4" ry="5.8" fill="#fdf4ff"/>
      <rect x="13" y="30.4" width="4.2" height="4.4" rx="2" fill="#fdf4ff"/><rect x="22.8" y="30.4" width="4.2" height="4.4" rx="2" fill="#fdf4ff"/>
      <rect x="13" y="33.4" width="4.2" height="1.5" rx=".7" fill="#e9d5ff"/><rect x="22.8" y="33.4" width="4.2" height="1.5" rx=".7" fill="#e9d5ff"/>
      <g class="pb"><path d="M10.6 11 Q3.4 14 5.8 26 Q9.4 20 11.4 16Z" fill="#a78bfa"/><path d="M11.2 12.4 Q5.4 18 7.4 27.6 Q10 22.4 12 18Z" fill="#f472b6"/><path d="M12 14 Q7.8 20 9.4 28.6 Q11.4 23.6 13 19Z" fill="#60a5fa"/>
      <path d="M29.4 11 Q36.6 14 34.2 26 Q30.6 20 28.6 16Z" fill="#a78bfa"/><path d="M28.8 12.4 Q34.6 18 32.6 27.6 Q30 22.4 28 18Z" fill="#f472b6"/><path d="M28 14 Q32.2 20 30.6 28.6 Q28.6 23.6 27 19Z" fill="#60a5fa"/>
      <circle cx="20" cy="16" r="9" fill="#fdf4ff"/><ellipse cx="20" cy="20" rx="5.4" ry="3.6" fill="#fbcfe8"/>
      <g class="pr" style="transform-box:fill-box;transform-origin:50% 100%"><path d="M12.4 10.4 L11.6 4.4 L16 8Z" fill="#fdf4ff"/></g><g class="pr" style="transform-box:fill-box;transform-origin:50% 100%"><path d="M27.6 10.4 L28.4 4.4 L24 8Z" fill="#fdf4ff"/></g>
      <path d="M18.2 8.4 L20 -3.4 L21.8 8.4Z" fill="#fbbf24"/><path d="M18.6 6 L21.2 4.6 M18.9 3.2 L20.8 2 M19.2 .6 L20.4 -.2" stroke="#d97706" stroke-width=".6" stroke-linecap="round"/>
      <g class="pe"><ellipse cx="15.8" cy="15.6" rx="1.7" ry="2.2" fill="#1f2937"/><circle cx="16.3" cy="14.8" r=".6" fill="#fff"/><path d="M13.8 14.2 L12.8 13.4" stroke="#1f2937" stroke-width=".8" stroke-linecap="round"/></g>
      <g class="pe"><ellipse cx="24.2" cy="15.6" rx="1.7" ry="2.2" fill="#1f2937"/><circle cx="24.7" cy="14.8" r=".6" fill="#fff"/><path d="M26.2 14.2 L27.2 13.4" stroke="#1f2937" stroke-width=".8" stroke-linecap="round"/></g>
      <circle cx="12.6" cy="19.4" r="1.6" fill="#f9a8d4" opacity=".7"/><circle cx="27.4" cy="19.4" r="1.6" fill="#f9a8d4" opacity=".7"/>
      <circle cx="18.6" cy="20.2" r=".6" fill="#be185d"/><circle cx="21.4" cy="20.2" r=".6" fill="#be185d"/><path d="M18.4 22 Q20 23 21.6 22" stroke="#be185d" stroke-width=".7" fill="none" stroke-linecap="round"/></g>
      <g class="psp"><path d="M4 8 L5 10.6 L7.6 11.6 L5 12.6 L4 15.2 L3 12.6 L.4 11.6 L3 10.6Z" fill="#fde047"/><path d="M35 2 L35.8 4 L37.8 4.8 L35.8 5.6 L35 7.6 L34.2 5.6 L32.2 4.8 L34.2 4Z" fill="#f9a8d4"/><circle cx="33" cy="12" r="1" fill="#a5f3fc"/></g>${zzz}`,
  };

  // Hər heyvanın edə biləcəyi hərəkətlər (sinif: act-<ad>, müddət ms)
  const ACTS = {
    common: [['blink', 260], ['blink', 260], ['hop', 560], ['sleep', 3200]],
    pet_dog: [['wag', 1100], ['ear', 600], ['bark', 900], ['wag', 1100]],
    pet_cat: [['wag', 1300], ['ear', 600], ['stretch', 1200]],
    pet_chick: [['peck', 1100], ['flap', 700]],
    pet_bunny: [['ear', 700], ['sniff', 900], ['hop', 560]],
    pet_fox: [['wag', 1200], ['ear', 600], ['sniff', 900]],
    pet_ghost: [['boo', 1100], ['wobble', 1000]],
    pet_panda: [['munch', 1500], ['ear', 600]],
    pet_dragon: [['fire', 1100], ['flap', 900], ['wag', 1100]],
    pet_unicorn: [['sparkle', 1500], ['toss', 900], ['wag', 1200]],
  };

  const has = (id) => id in SVG;
  const html = (id) => (has(id) ? `<span class="vil-pet pet-${id}" data-pet="${id}"><svg class="pet-svg" viewBox="0 -4 40 40" aria-hidden="true">${SVG[id]()}</svg></span>` : '');
  // Mağaza kartı və önizləmə üçün tək heyvan
  const sample = (id) => (has(id) ? `<span class="pet-sample">${html(id).replace('class="vil-pet', 'class="vil-pet still')}</span>` : '');

  // ---- Təsadüfi hərəkət taymeri ----
  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
  function tick() {
    if (document.hidden || reduced()) return;
    document.querySelectorAll('.vil-pet:not(.busy):not(.still)').forEach((el) => {
      if (Math.random() > 0.16) return; // hər heyvan öz təsadüfi vaxtında
      const id = el.dataset.pet;
      const list = [...(ACTS[id] || []), ...ACTS.common];
      const [name, ms] = list[Math.floor(Math.random() * list.length)];
      el.classList.add('busy', `act-${name}`);
      setTimeout(() => el.classList.remove('busy', `act-${name}`), ms);
    });
  }
  setInterval(tick, 700);

  return { has, html, sample, ids: Object.keys(SVG) };
})();
window.PetArt = PetArt;

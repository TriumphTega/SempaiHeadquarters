// Simple line icons for the public website (inherit currentColor).
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const S = ({ children, size = 24 }) => <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>{children}</svg>;

export const IconBook = (p) => <S {...p}><path {...P} d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2V5Z" /><path {...P} d="M4 20a2 2 0 0 0 2 2h13v-4" /></S>;
export const IconCoins = (p) => <S {...p}><ellipse {...P} cx="9" cy="7" rx="6" ry="3" /><path {...P} d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7" /><path {...P} d="M9 15v2c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.6-2.4-2.9-5.5-3" /></S>;
export const IconGem = (p) => <S {...p}><path {...P} d="M6 3h12l4 6-10 12L2 9l4-6Z" /><path {...P} d="M2 9h20M12 21 8 9l4-6 4 6-4 12" /></S>;
export const IconCards = (p) => <S {...p}><rect {...P} x="3" y="6" width="11" height="15" rx="2" transform="rotate(-8 8.5 13.5)" /><rect {...P} x="10" y="3" width="11" height="15" rx="2" transform="rotate(8 15.5 10.5)" /></S>;
export const IconStore = (p) => <S {...p}><path {...P} d="M4 9 5.5 4h13L20 9" /><path {...P} d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9" /><path {...P} d="M5 11v9h14v-9M10 20v-5h4v5" /></S>;
export const IconWallet = (p) => <S {...p}><path {...P} d="M4 7a2 2 0 0 1 2-2h12v4" /><rect {...P} x="3" y="7" width="18" height="13" rx="3" /><circle cx="16.5" cy="13.5" r="1.4" fill="currentColor" /></S>;
export const IconPen = (p) => <S {...p}><path {...P} d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path {...P} d="m13.5 6.5 4 4" /></S>;
export const IconBell = (p) => <S {...p}><path {...P} d="M6 9a6 6 0 0 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9Z" /><path {...P} d="M10 20a2.2 2.2 0 0 0 4 0" /></S>;
export const IconShield = (p) => <S {...p}><path {...P} d="M12 3 4.5 6v6c0 4.4 3.2 7.9 7.5 9 4.3-1.1 7.5-4.6 7.5-9V6L12 3Z" /><path {...P} d="m8.8 12 2.2 2.2 4.4-4.4" /></S>;
export const IconBolt = (p) => <S {...p}><path {...P} d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></S>;
export const IconPhone = (p) => <S {...p}><rect {...P} x="6" y="2" width="12" height="20" rx="3" /><path {...P} d="M11 18h2" /></S>;
export const IconMonitor = (p) => <S {...p}><rect {...P} x="2" y="4" width="20" height="13" rx="2.5" /><path {...P} d="M8 21h8M12 17v4" /></S>;
export const IconAndroid = (p) => <S {...p}><path {...P} d="M5 10a7 7 0 0 1 14 0v7H5v-7Z" /><path {...P} d="m7 4 1.6 2.4M17 4l-1.6 2.4" /><circle cx="9.5" cy="12" r="1" fill="currentColor" /><circle cx="14.5" cy="12" r="1" fill="currentColor" /><path {...P} d="M8 17v3M16 17v3" /></S>;
export const IconApple = (p) => <S {...p}><path fill="currentColor" d="M16.4 12.6c0-2.4 2-3.5 2-3.6a4.4 4.4 0 0 0-3.4-1.9c-1.5-.1-2.8.9-3.5.9s-1.8-.8-3-.8a4.5 4.5 0 0 0-3.8 2.3c-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.3a9.6 9.6 0 0 0 1.3-2.6 4 4 0 0 1-2.5-3.6ZM14 5.6a4 4 0 0 0 1-3 4.2 4.2 0 0 0-2.7 1.4 3.9 3.9 0 0 0-1 2.9 3.5 3.5 0 0 0 2.7-1.3Z" /></S>;
export const IconArrow = (p) => <S {...p}><path {...P} d="M5 12h14M13 6l6 6-6 6" /></S>;
export const IconGlobe = (p) => <S {...p}><circle {...P} cx="12" cy="12" r="9" /><path {...P} d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" /></S>;
export const IconShare = (p) => <S {...p}><path {...P} d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13" /></S>;
export const IconUsers = (p) => <S {...p}><circle {...P} cx="9" cy="8" r="3.5" /><path {...P} d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path {...P} d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14a6.5 6.5 0 0 1 3 6" /></S>;
export const IconTrophy = (p) => <S {...p}><path {...P} d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path {...P} d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 21h8M9 18h6" /></S>;

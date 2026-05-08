"use client";

// Decorative line-art botanical accent — sage stroke, hand-drawn feel.
// Pure SVG, no images. Sits behind/beside hero copy as quiet ornament.

export function BotanicalAccent({
  className = "",
  width = 360,
}: {
  className?: string;
  width?: number;
}) {
  return (
    <svg
      viewBox="0 0 360 360"
      width={width}
      height={width}
      fill="none"
      stroke="currentColor"
      strokeWidth="0.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-sage-400 ${className}`}
      aria-hidden
    >
      {/* Central stem */}
      <path d="M 180 30 C 178 90 184 160 180 240 C 178 280 184 320 180 340" opacity="0.6" />

      {/* Left branches w/ leaves */}
      <g opacity="0.55">
        <path d="M 180 90 C 150 92 120 88 88 96" />
        <path d="M 88 96 C 78 88 70 86 56 90 C 60 100 68 108 88 96 Z" />
        <path d="M 180 140 C 158 144 132 142 110 152" />
        <path d="M 110 152 C 100 144 92 144 80 150 C 86 158 96 162 110 152 Z" />
        <path d="M 180 196 C 156 200 130 204 104 220" />
        <path d="M 104 220 C 96 212 86 212 74 220 C 80 228 92 232 104 220 Z" />
        <path d="M 180 250 C 162 256 144 264 128 278" />
        <path d="M 128 278 C 122 270 112 268 100 274 C 104 282 116 288 128 278 Z" />
      </g>

      {/* Right branches w/ leaves */}
      <g opacity="0.5">
        <path d="M 180 110 C 208 114 240 116 270 124" />
        <path d="M 270 124 C 280 118 290 118 304 124 C 298 132 286 134 270 124 Z" />
        <path d="M 180 170 C 206 174 232 180 256 192" />
        <path d="M 256 192 C 266 186 276 188 288 196 C 282 204 268 206 256 192 Z" />
        <path d="M 180 220 C 204 226 224 234 248 250" />
        <path d="M 248 250 C 256 244 268 246 278 254 C 270 262 258 264 248 250 Z" />
        <path d="M 180 280 C 198 286 216 296 230 308" />
        <path d="M 230 308 C 236 302 246 304 254 312 C 248 320 238 320 230 308 Z" />
      </g>

      {/* Tiny berry/bud accents */}
      <g fill="currentColor" opacity="0.45">
        <circle cx="60" cy="86" r="1.6" />
        <circle cx="304" cy="120" r="1.6" />
        <circle cx="80" cy="148" r="1.4" />
        <circle cx="288" cy="194" r="1.4" />
      </g>
    </svg>
  );
}

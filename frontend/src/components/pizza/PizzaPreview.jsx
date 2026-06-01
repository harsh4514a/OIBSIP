import { motion, AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'

const SIZE_DIMS = {
  small: 140,
  medium: 170,
  large: 200,
  xl: 230,
}

// Deterministic scatter generator based on topping key
const getToppingPositions = (toppingKey, count = 10) => {
  let seed = 0
  for (let i = 0; i < toppingKey.length; i++) {
    seed += toppingKey.charCodeAt(i)
  }
  const random = () => {
    const x = Math.sin(seed++) * 10000
    return x - Math.floor(x)
  }

  const positions = []
  for (let i = 0; i < count; i++) {
    const angle = random() * 360
    const r = 25 + random() * 85 // distance from center (max ~110px)
    const rotation = random() * 360
    const scale = 0.85 + random() * 0.3 // slight random size variation
    positions.push({ angle, r, rotation, scale })
  }
  return positions
}

// High-fidelity Topping Vector Components
const ToppingRenderers = {
  bellpeppers: ({ rotation }) => (
    <g transform={`rotate(${rotation})`}>
      {/* Curved green bell pepper slice */}
      <path
        d="M -10,-4 C -6,-10 6,-10 10,-4 C 7,-3 -7,-3 -10,-4 Z"
        fill="#22c55e"
        stroke="#166534"
        strokeWidth="0.75"
      />
      {/* Inner highlight */}
      <path
        d="M -8,-5 C -4,-9 4,-9 8,-5 C 5,-4.5 -5,-4.5 -8,-5 Z"
        fill="#4ade80"
        opacity="0.7"
      />
    </g>
  ),
  olives: ({ rotation }) => (
    <g transform={`rotate(${rotation})`}>
      {/* Sliced olive ring */}
      <circle cx="0" cy="0" r="7" fill="#1e1b4b" stroke="#0f172a" strokeWidth="0.5" />
      <circle cx="0" cy="0" r="2.8" fill="#2d0606" />
      {/* Specular light reflect spot */}
      <circle cx="-2.5" cy="-2.5" r="1.2" fill="#ffffff" opacity="0.5" />
    </g>
  ),
  mushrooms: ({ rotation }) => (
    <g transform={`rotate(${rotation})`}>
      {/* Mushroom cap slice */}
      <path
        d="M -7,-1 C -7,-8 7,-8 7,-1 C 5,1 2.5,1 2.5,5 C 2.5,6.5 -2.5,6.5 -2.5,5 C -2.5,1 -5,1 -7,-1 Z"
        fill="#e5e7eb"
        stroke="#9ca3af"
        strokeWidth="0.5"
      />
      {/* Cap core detail */}
      <path
        d="M -5,-1 C -5,-5 5,-5 5,-1 Z"
        fill="#d1d5db"
      />
      {/* Stem detail */}
      <path
        d="M -1.5,1 L 1.5,1 L 1,4 L -1,4 Z"
        fill="#f3f4f6"
      />
      {/* Gill markings */}
      <path d="M -4,-1 L -3,-3 M -1,-1 L -1,-4 M 2,-1 L 1,-3" stroke="#9ca3af" strokeWidth="0.5" />
    </g>
  ),
  onions: ({ rotation }) => (
    <g transform={`rotate(${rotation})`}>
      {/* Wavy onion ring slice */}
      <path
        d="M -14,-1 C -7,-9 7,-9 14,-1"
        fill="none"
        stroke="#f472b6"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Inner layer outline */}
      <path
        d="M -12.5,-1 C -6,-8.2 6,-8.2 12.5,-1"
        fill="none"
        stroke="#fdf2f8"
        strokeWidth="0.75"
        strokeLinecap="round"
        opacity="0.8"
      />
    </g>
  ),
  corn: ({ rotation }) => (
    <g transform={`rotate(${rotation})`}>
      {/* Double corn kernel cluster */}
      <ellipse cx="0" cy="0" rx="3" ry="4.5" fill="#facc15" stroke="#ca8a04" strokeWidth="0.5" />
      <ellipse cx="-0.8" cy="-1" rx="1.2" ry="2" fill="#fef08a" opacity="0.6" />
      
      <ellipse cx="4" cy="2" rx="2.5" ry="3.8" fill="#eab308" stroke="#ca8a04" strokeWidth="0.5" transform="rotate(15, 4, 2)" />
    </g>
  ),
  jalapenos: ({ rotation }) => (
    <g transform={`rotate(${rotation})`}>
      {/* Thick jalapeño wheel slice */}
      <circle cx="0" cy="0" r="8.5" fill="#15803d" stroke="#14532d" strokeWidth="0.5" />
      <circle cx="0" cy="0" r="6.5" fill="#86efac" />
      {/* Inner divisions */}
      <path d="M -3.5,-2 C -4.5,0.5 -2.5,3 0,3.5 C 2.5,3.5 4,1.5 3,-1 C 2.5,-3 0,-4.5 -3.5,-2 Z" fill="#15803d" opacity="0.25" />
      {/* Seeds */}
      <circle cx="-2" cy="-2.5" r="1.1" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.25" />
      <circle cx="2.5" cy="-0.5" r="1.1" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.25" />
      <circle cx="-0.5" cy="2.8" r="1.1" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.25" />
    </g>
  ),
  tomatoes: ({ rotation }) => (
    <g transform={`rotate(${rotation})`}>
      {/* Half tomato wedge slice */}
      <path
        d="M -11,0 A 11,11 0 0,0 11,0 Z"
        fill="#dc2626"
        stroke="#991b1b"
        strokeWidth="0.5"
      />
      <path
        d="M -9,-1 A 9,9 0 0,0 9,-1 Z"
        fill="#ef4444"
      />
      {/* Cavities */}
      <path d="M -6,-2 C -5,-4.5 -2.5,-4.5 -1.5,-2 Z" fill="#7f1d1d" opacity="0.5" />
      <path d="M 1.5,-2 C 2.5,-4.5 5,-4.5 6,-2 Z" fill="#7f1d1d" opacity="0.5" />
      {/* Seed dots */}
      <circle cx="-3.5" cy="-3" r="0.8" fill="#fbbf24" />
      <circle cx="3.8" cy="-3" r="0.8" fill="#fbbf24" />
    </g>
  ),
  spinach: ({ rotation }) => (
    <g transform={`rotate(${rotation})`}>
      {/* Ribbed spinach leaf */}
      <path
        d="M 0,9 C -7,2 -7,-4 0,-9 C 7,-4 7,2 0,9 Z"
        fill="#166534"
        stroke="#14532d"
        strokeWidth="0.5"
      />
      {/* Leaf vein */}
      <path
        d="M 0,8 L 0,-7 M 0,4 L -3.5,1.5 M 0,1.5 L 3.5,-1 M 0,-1 L -3,-3.5"
        stroke="#15803d"
        strokeWidth="0.5"
        strokeLinecap="round"
      />
    </g>
  ),
}

// Toasted spots on cooked cheese (Mozzarella, Cheddar, etc.)
const CHEESE_BUBBLES = [
  { cx: 165, cy: 155, rx: 7, ry: 5, rot: 15 },
  { cx: 235, cy: 165, rx: 8, ry: 6, rot: -25 },
  { cx: 155, cy: 225, rx: 6, ry: 9, rot: 45 },
  { cx: 245, cy: 235, rx: 8, ry: 6, rot: 10 },
  { cx: 195, cy: 135, rx: 10, ry: 5, rot: -5 },
  { cx: 175, cy: 265, rx: 6, ry: 6, rot: 0 },
  { cx: 205, cy: 205, rx: 5, ry: 5, rot: 30 },
  { cx: 265, cy: 195, rx: 7, ry: 5, rot: 65 },
  { cx: 145, cy: 185, rx: 9, ry: 6, rot: -40 },
  { cx: 205, cy: 245, rx: 8, ry: 6, rot: -15 },
]

export default function PizzaPreview({ size = 'medium', base = 'thin', sauce = 'tomato', cheese = 'mozzarella', veggies = [], hideDetails = false }) {
  const dim = SIZE_DIMS[size] || 170

  // Standardize naming mapping
  const normalizedBase = useMemo(() => {
    if (base === 'gluten-free' || base === 'glutenfree') return 'glutenfree'
    return base
  }, [base])

  const normalizedSauce = useMemo(() => {
    if (sauce === 'whitegarlic' || sauce === 'white-garlic') return 'whitegarlic'
    return sauce
  }, [sauce])

  // Pizza radius mapping for visual scale
  const pizzaRadius = useMemo(() => {
    return {
      small: 110,
      medium: 135,
      large: 160,
      xl: 185,
    }[size] || 135
  }, [size])

  // Get active sauce gradient
  const sauceGradId = useMemo(() => {
    return `sauce-${normalizedSauce}`
  }, [normalizedSauce])

  // Get active cheese gradient
  const cheeseGradId = useMemo(() => {
    return `cheese-${cheese}`
  }, [cheese])

  // Normalize toppings naming to match renderer keys
  const activeToppings = useMemo(() => {
    const keyMap = {
      bellpeppers: 'bellpeppers',
      'bell-peppers': 'bellpeppers',
      olives: 'olives',
      mushrooms: 'mushrooms',
      onions: 'onions',
      corn: 'corn',
      jalapenos: 'jalapenos',
      'jalapeños': 'jalapenos',
      tomatoes: 'tomatoes',
      spinach: 'spinach',
    }
    
    return veggies.map(v => ({
      key: keyMap[v.toLowerCase().replace(/\s/g, '')] || 'bellpeppers',
      original: v
    }))
  }, [veggies])

  return (
    <div className={hideDetails ? "w-full h-full relative" : "flex flex-col items-center justify-center p-4"}>
      {/* Pizza SVG Canvas */}
      <div 
        className={hideDetails ? "w-full h-full relative" : "relative shadow-2xl rounded-full"} 
        style={hideDetails ? {} : { width: dim + 40, height: dim + 40 }}
      >
        <svg
          viewBox="0 0 400 400"
          className="w-full h-full overflow-visible select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* 1. Crust Gradients */}
            <radialGradient id="crust-classic" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#efddc2" />
              <stop offset="70%" stopColor="#e4c498" />
              <stop offset="85%" stopColor="#cd9f62" />
              <stop offset="93%" stopColor="#af7033" />
              <stop offset="97%" stopColor="#8d4b1a" />
              <stop offset="100%" stopColor="#552c0a" />
            </radialGradient>

            <radialGradient id="crust-wheat" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ccb599" />
              <stop offset="70%" stopColor="#b49372" />
              <stop offset="85%" stopColor="#96704d" />
              <stop offset="93%" stopColor="#7a512d" />
              <stop offset="97%" stopColor="#5d391b" />
              <stop offset="100%" stopColor="#3d210a" />
            </radialGradient>

            <radialGradient id="crust-glutenfree" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f3e8d2" />
              <stop offset="70%" stopColor="#e9d2b2" />
              <stop offset="85%" stopColor="#d6b38c" />
              <stop offset="93%" stopColor="#ba9264" />
              <stop offset="97%" stopColor="#956b3e" />
              <stop offset="100%" stopColor="#63421d" />
            </radialGradient>

            {/* 2. Sauce Gradients */}
            <radialGradient id="sauce-tomato" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="65%" stopColor="#dc2626" />
              <stop offset="90%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </radialGradient>

            <radialGradient id="sauce-bbq" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="70%" stopColor="#451a03" />
              <stop offset="100%" stopColor="#290c01" />
            </radialGradient>

            <radialGradient id="sauce-whitegarlic" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fffbeb" />
              <stop offset="80%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#ca8a04" opacity="0.6" />
            </radialGradient>

            <radialGradient id="sauce-pesto" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="70%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#14532d" />
            </radialGradient>

            <radialGradient id="sauce-buffalo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="75%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#9a3412" />
            </radialGradient>

            {/* 3. Cheese Gradients */}
            <radialGradient id="cheese-mozzarella" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fefcf0" />
              <stop offset="60%" stopColor="#fef9c3" />
              <stop offset="85%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#fde047" opacity="0.75" />
            </radialGradient>

            <radialGradient id="cheese-cheddar" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="90%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </radialGradient>

            <radialGradient id="cheese-parmesan" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fafaf9" />
              <stop offset="80%" stopColor="#f5f5f4" opacity="0.9" />
              <stop offset="100%" stopColor="#e7e5e4" opacity="0.6" />
            </radialGradient>

            <radialGradient id="cheese-vegan" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fefce8" />
              <stop offset="75%" stopColor="#fef9c3" opacity="0.95" />
              <stop offset="100%" stopColor="#fef3c7" opacity="0.8" />
            </radialGradient>

            <radialGradient id="cheese-extra" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#fefcbf" />
              <stop offset="80%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#facc15" opacity="0.9" />
            </radialGradient>

            {/* 4. Filter Effects */}
            {/* Hand-tossed organic wavy edges */}
            <filter id="organic-distortion" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G" />
            </filter>

            {/* Subtle shadow on ingredients */}
            <filter id="topping-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="1.5" dy="2.5" stdDeviation="1.8" floodColor="#000" floodOpacity="0.45" />
            </filter>

            {/* Blur filter for baked cheese spots */}
            <filter id="cheese-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" />
            </filter>

            {/* Base shadow filter */}
            <filter id="pizza-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="12" stdDeviation="15" floodColor="#000" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Pizza Shadow Circle */}
          <circle cx="200" cy="200" r={pizzaRadius} fill="#000" opacity="0.15" filter="url(#pizza-shadow)" />

          {/* 1. Crust Layer */}
          <circle
            cx="200"
            cy="200"
            r={pizzaRadius}
            fill={`url(#crust-${normalizedBase === 'wheat' ? 'wheat' : normalizedBase === 'glutenfree' ? 'glutenfree' : 'classic'})`}
          />

          {/* Crust Details for Puffiness (Thick or Stuffed) */}
          {normalizedBase === 'stuffed' && (
            <circle cx="200" cy="200" r={pizzaRadius - 10} fill="none" stroke="#fef08a" strokeWidth="8" opacity="0.35" filter="url(#cheese-blur)" />
          )}
          {normalizedBase === 'thick' && (
            <circle cx="200" cy="200" r={pizzaRadius - 8} fill="none" stroke="#a16207" strokeWidth="12" opacity="0.25" filter="url(#cheese-blur)" />
          )}

          {/* 2. Sauce Layer */}
          <circle
            cx="200"
            cy="200"
            r={pizzaRadius - 16}
            fill={`url(#${sauceGradId})`}
            filter="url(#organic-distortion)"
          />

          {/* 3. Cheese Layer */}
          <circle
            cx="200"
            cy="200"
            r={pizzaRadius - 20}
            fill={`url(#${cheeseGradId})`}
            filter="url(#organic-distortion)"
            opacity="0.93"
          />

          {/* Extra cheese layering */}
          {cheese === 'extra' && (
            <circle
              cx="200"
              cy="200"
              r={pizzaRadius - 24}
              fill="url(#cheese-extra)"
              filter="url(#organic-distortion)"
              opacity="0.75"
            />
          )}

          {/* 4. Caramelized Baked Cheese Bubbles (skip for vegan cheese) */}
          {cheese !== 'vegan' && (
            <g filter="url(#cheese-blur)">
              {CHEESE_BUBBLES.map((b, idx) => {
                // Adjust position scale based on radius
                const scaleFactor = pizzaRadius / 135
                const cxScaled = 200 + (b.cx - 200) * scaleFactor
                const cyScaled = 200 + (b.cy - 200) * scaleFactor
                return (
                  <ellipse
                    key={idx}
                    cx={cxScaled}
                    cy={cyScaled}
                    rx={b.rx}
                    ry={b.ry}
                    transform={`rotate(${b.rot}, ${cxScaled}, ${cyScaled})`}
                    fill="#78350f"
                    opacity="0.55"
                  />
                )
              })}
            </g>
          )}

          {/* 5. Toppings Layers */}
          <g filter="url(#topping-shadow)">
            <AnimatePresence>
              {activeToppings.flatMap(({ key }, toppingIdx) => {
                const Renderer = ToppingRenderers[key]
                if (!Renderer) return []

                // Get deterministic positions for this topping key
                const positions = getToppingPositions(key, 8)

                return positions.map((pos, instanceIdx) => {
                  const rad = (pos.angle * Math.PI) / 180
                  // Scale positions dynamically based on current pizza size radius
                  const scaledRadius = pos.r * (pizzaRadius / 145)
                  const x = 200 + Math.cos(rad) * scaledRadius
                  const y = 200 + Math.sin(rad) * scaledRadius

                  return (
                    <g key={`${key}-${instanceIdx}`} transform={`translate(${x}, ${y})`}>
                      <motion.g
                        initial={{ scale: 0, opacity: 0, y: -40 }}
                        animate={{ scale: pos.scale, opacity: 1, y: 0 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{
                          type: 'spring',
                          stiffness: 220,
                          damping: 14,
                          delay: (toppingIdx * 0.05) + (instanceIdx * 0.02)
                        }}
                      >
                        <Renderer rotation={pos.rotation} />
                      </motion.g>
                    </g>
                  )
                })
              })}
            </AnimatePresence>
          </g>
        </svg>
      </div>

      {/* Info labels underneath */}
      {!hideDetails && (
        <div className="mt-6 text-center space-y-1.5">
          <p className="font-display font-bold text-foreground capitalize text-lg tracking-wide">
            {size} · {base.replace(/-/g, ' ')}
          </p>
          <p className="text-sm text-muted-foreground capitalize font-medium">
            {sauce.replace(/-/g, ' ')} Sauce · {cheese} Cheese
          </p>
          {activeToppings.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-2.5 max-w-xs">
              {Array.from(new Set(activeToppings.map(t => t.original))).map(toppingName => {
                const key = activeToppings.find(t => t.original === toppingName)?.key
                // Emojis for list mapping
                const emojis = {
                  bellpeppers: '🫑',
                  olives: '🫒',
                  mushrooms: '🍄',
                  onions: '🧅',
                  corn: '🌽',
                  jalapenos: '🌶️',
                  tomatoes: '🍅',
                  spinach: '🥬',
                }
                return (
                  <span
                    key={toppingName}
                    className="text-xs px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-semibold border border-orange-200/50 dark:border-orange-900/30 flex items-center gap-1"
                  >
                    {emojis[key] || '🥗'} {toppingName}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

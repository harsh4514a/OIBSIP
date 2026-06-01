import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useCart } from '../../hooks/useCart';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import PizzaPreview from './PizzaPreview';

const STEPS = ['Size', 'Base', 'Sauce', 'Cheese', 'Veggies', 'Review'];

const OPTIONS = {
  size: [
    { id: 'small', label: 'Small', desc: '6 inches', price: 199, emoji: '🍕', serves: '1-2' },
    { id: 'medium', label: 'Medium', desc: '9 inches', price: 299, emoji: '🍕', serves: '2-3' },
    { id: 'large', label: 'Large', desc: '12 inches', price: 399, emoji: '🍕', serves: '3-4' },
    { id: 'xl', label: 'XL', desc: '15 inches', price: 499, emoji: '🍕', serves: '4-6' },
  ],
  base: [
    { id: 'thin', label: 'Thin Crust', extra: 0, desc: 'Light & crispy' },
    { id: 'thick', label: 'Thick Crust', extra: 20, desc: 'Soft & fluffy' },
    { id: 'stuffed', label: 'Stuffed Crust', extra: 50, desc: 'Cheese-filled' },
    { id: 'wheat', label: 'Wheat', extra: 10, desc: 'Healthy choice' },
    { id: 'glutenfree', label: 'Gluten-Free', extra: 30, desc: 'Allergen-free' },
  ],
  sauce: [
    { id: 'tomato', label: 'Tomato', extra: 0, color: '#e53e3e', emoji: '🍅' },
    { id: 'bbq', label: 'BBQ', extra: 20, color: '#744210', emoji: '🔥' },
    { id: 'whitegarlic', label: 'White Garlic', extra: 20, color: '#fffde7', emoji: '🧄' },
    { id: 'pesto', label: 'Pesto', extra: 25, color: '#276749', emoji: '🌿' },
    { id: 'buffalo', label: 'Buffalo', extra: 20, color: '#e05a0d', emoji: '🌶️' },
  ],
  cheese: [
    { id: 'mozzarella', label: 'Mozzarella', extra: 0, emoji: '🧀' },
    { id: 'cheddar', label: 'Cheddar', extra: 20, emoji: '🧀' },
    { id: 'parmesan', label: 'Parmesan', extra: 30, emoji: '🧀' },
    { id: 'vegan', label: 'Vegan Cheese', extra: 25, emoji: '🌱' },
    { id: 'extra', label: 'Extra Cheese', extra: 40, emoji: '🧀' },
  ],
  veggies: [
    { id: 'bellpeppers', label: 'Bell Peppers', extra: 10, emoji: '🫑' },
    { id: 'olives', label: 'Olives', extra: 10, emoji: '🫒' },
    { id: 'mushrooms', label: 'Mushrooms', extra: 10, emoji: '🍄' },
    { id: 'onions', label: 'Onions', extra: 10, emoji: '🧅' },
    { id: 'corn', label: 'Corn', extra: 10, emoji: '🌽' },
    { id: 'jalapenos', label: 'Jalapeños', extra: 10, emoji: '🌶️' },
    { id: 'tomatoes', label: 'Tomatoes', extra: 10, emoji: '🍅' },
    { id: 'spinach', label: 'Spinach', extra: 10, emoji: '🥬' },
  ],
};

const DEFAULTS = {
  size: 'medium',
  base: 'thin',
  sauce: 'tomato',
  cheese: 'mozzarella',
  veggies: [],
};

const mapSelectionsToBackend = (selections) => {
  const baseMap = {
    thin: 'thin',
    thick: 'thick',
    stuffed: 'stuffed',
    wheat: 'wheat',
    glutenfree: 'gluten-free'
  };
  const sauceMap = {
    tomato: 'tomato',
    bbq: 'bbq',
    whitegarlic: 'white-garlic',
    pesto: 'pesto',
    buffalo: 'buffalo'
  };
  const veggiesMap = {
    bellpeppers: 'bell-peppers',
    olives: 'olives',
    mushrooms: 'mushrooms',
    onions: 'onions',
    corn: 'corn',
    jalapenos: 'jalapenos',
    tomatoes: 'tomatoes',
    spinach: 'spinach'
  };

  return {
    size: selections.size,
    base: baseMap[selections.base] || selections.base,
    sauce: sauceMap[selections.sauce] || selections.sauce,
    cheese: selections.cheese,
    veggies: selections.veggies.map(v => veggiesMap[v] || v),
  };
};

function PizzaBuilder({ onComplete }) {
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState(DEFAULTS);
  const [adding, setAdding] = useState(false);
  const { addToCart } = useCart();

  const totalPrice = useMemo(() => {
    const sizePrice = OPTIONS.size.find(s => s.id === selections.size)?.price || 299;
    const baseExtra = OPTIONS.base.find(b => b.id === selections.base)?.extra || 0;
    const sauceExtra = OPTIONS.sauce.find(s => s.id === selections.sauce)?.extra || 0;
    const cheeseExtra = OPTIONS.cheese.find(c => c.id === selections.cheese)?.extra || 0;
    const veggiesExtra = selections.veggies.length * 10;
    return sizePrice + baseExtra + sauceExtra + cheeseExtra + veggiesExtra;
  }, [selections]);

  const handleSingle = (key, val) => setSelections(s => ({ ...s, [key]: val }));
  
  const handleMulti = (key, val) => {
    setSelections(s => ({
      ...s,
      [key]: s[key].includes(val)
        ? s[key].filter(v => v !== val)
        : [...s[key], val],
    }));
  };

  const handleAddToCart = async () => {
    setAdding(true);
    try {
      const mapped = mapSelectionsToBackend(selections);
      const payload = {
        type: 'custom',
        size: mapped.size,
        quantity: 1,
        base: mapped.base,
        sauce: mapped.sauce,
        cheese: mapped.cheese,
        veggies: mapped.veggies,
        customizations: mapped,
        name: 'Custom Pizza'
      };
      await addToCart(payload);
      onComplete?.();
      toast.success('Custom pizza added to cart! 🍕');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add custom pizza to cart.');
    } finally {
      setAdding(false);
    }
  };

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };
  const [direction, setDirection] = useState(1);

  const goNext = () => { setDirection(1); setStep(s => s + 1); };
  const goPrev = () => { setDirection(-1); setStep(s => s - 1); };

  const renderStep = () => {
    switch (step) {
      case 0: // Size
        return (
          <div className="grid grid-cols-2 gap-3">
            {OPTIONS.size.map(opt => (
              <button
                key={opt.id}
                onClick={() => handleSingle('size', opt.id)}
                className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  selections.size === opt.id
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                }`}
              >
                <div className="text-3xl mb-2" style={{ fontSize: { small: '2rem', medium: '2.5rem', large: '3rem', xl: '3.5rem' }[opt.id] }}>
                  {opt.emoji}
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.desc} • Serves {opt.serves}</p>
                <p className="text-orange-500 font-bold mt-1">{formatCurrency(opt.price)}</p>
                {selections.size === opt.id && (
                  <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        );

      case 1: // Base
        return (
          <div className="space-y-2">
            {OPTIONS.base.map(opt => (
              <button
                key={opt.id}
                onClick={() => handleSingle('base', opt.id)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  selections.base === opt.id
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                }`}
              >
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-orange-500">
                    {opt.extra > 0 ? `+${formatCurrency(opt.extra)}` : 'Included'}
                  </span>
                  {selections.base === opt.id && (
                    <div className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        );

      case 2: // Sauce
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {OPTIONS.sauce.map(opt => (
              <button
                key={opt.id}
                onClick={() => handleSingle('sauce', opt.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  selections.sauce === opt.id
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                }`}
              >
                <div className="text-2xl mb-2">{opt.emoji}</div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{opt.label}</p>
                <p className="text-xs text-orange-500 font-medium mt-1">
                  {opt.extra > 0 ? `+₹${opt.extra}` : 'Free'}
                </p>
              </button>
            ))}
          </div>
        );

      case 3: // Cheese
        return (
          <div className="space-y-2">
            {OPTIONS.cheese.map(opt => (
              <button
                key={opt.id}
                onClick={() => handleSingle('cheese', opt.id)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  selections.cheese === opt.id
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{opt.emoji}</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{opt.label}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-orange-500">
                    {opt.extra > 0 ? `+₹${opt.extra}` : 'Included'}
                  </span>
                  {selections.cheese === opt.id && (
                    <div className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        );

      case 4: // Veggies
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {OPTIONS.veggies.map(opt => {
              const selected = selections.veggies.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => handleMulti('veggies', opt.id)}
                  className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${
                    selected
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{opt.emoji}</div>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">{opt.label}</p>
                  <p className="text-xs text-orange-500">+₹10</p>
                </button>
              );
            })}
          </div>
        );

      case 5: // Review
        const sizeOption = OPTIONS.size.find(s => s.id === selections.size);
        const baseOption = OPTIONS.base.find(b => b.id === selections.base);
        const sauceOption = OPTIONS.sauce.find(s => s.id === selections.sauce);
        const cheeseOption = OPTIONS.cheese.find(c => c.id === selections.cheese);
        const veggieOptions = OPTIONS.veggies.filter(v => selections.veggies.includes(v.id));

        return (
          <div className="space-y-4">
            <div className="rounded-xl bg-orange-50 dark:bg-orange-950/20 p-4 space-y-3">
              {[
                { label: 'Size', value: sizeOption?.label, price: sizeOption?.price },
                { label: 'Base', value: baseOption?.label, price: baseOption?.extra },
                { label: 'Sauce', value: sauceOption?.label, price: sauceOption?.extra },
                { label: 'Cheese', value: cheeseOption?.label, price: cheeseOption?.extra },
              ].map(({ label, value, price }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{label}:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {value} {price ? <span className="text-orange-500">(+₹{price})</span> : ''}
                  </span>
                </div>
              ))}
              {veggieOptions.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Veggies:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {veggieOptions.map(v => v.emoji).join(' ')} (+₹{veggieOptions.length * 10})
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t border-orange-200 dark:border-orange-800 pt-3">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-orange-500 text-xl">{formatCurrency(totalPrice)}</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-12 gap-8">
      {/* Left Column: Live Pizza Preview */}
      <div className="md:col-span-5 flex flex-col items-center justify-start bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-850 p-6 shadow-sm h-fit sticky top-24">
        <h3 className="text-lg font-bold font-display text-gray-900 dark:text-white mb-4">
          Live Pizza Preview
        </h3>
        <PizzaPreview
          size={selections.size}
          base={selections.base}
          sauce={selections.sauce}
          cheese={selections.cheese}
          veggies={selections.veggies}
        />
      </div>

      {/* Right Column: Customization Steps */}
      <div className="md:col-span-7">
        {/* Progress */}
        <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-shrink-0">
              <div className="flex flex-col items-center">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    i < step
                      ? 'bg-orange-500 text-white'
                      : i === step
                      ? 'bg-orange-500 text-white ring-4 ring-orange-200 dark:ring-orange-900'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}
                >
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                <span className={`text-[10px] mt-1 font-medium ${i === step ? 'text-orange-500' : 'text-gray-400'}`}>
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-8 mx-1 transition-colors duration-300 ${i < step ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Live price */}
        <div className="mb-6 flex items-center justify-between bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 rounded-xl p-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Your pizza price</p>
            <motion.p
              key={totalPrice}
              initial={{ scale: 1.2, color: '#ea580c' }}
              animate={{ scale: 1, color: '#f97316' }}
              className="text-2xl font-bold font-display text-orange-500"
            >
              {formatCurrency(totalPrice)}
            </motion.p>
          </div>
          <div className="text-4xl animate-bounce-light">🍕</div>
        </div>

        {/* Step header */}
        <h3 className="text-xl font-bold font-display text-gray-900 dark:text-white mb-4">
          Step {step + 1}: Choose your {STEPS[step]}
        </h3>

        {/* Step content */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="min-h-[250px]"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={step === 0}
          >
            <ChevronLeft size={18} /> Back
          </Button>
          
          {step === STEPS.length - 1 ? (
            <Button onClick={handleAddToCart} loading={adding} size="lg">
              <ShoppingCart size={18} />
              Add to Cart • {formatCurrency(totalPrice)}
            </Button>
          ) : (
            <Button onClick={goNext}>
              Next <ChevronRight size={18} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PizzaBuilder;

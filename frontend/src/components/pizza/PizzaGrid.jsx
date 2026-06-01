import { motion } from 'framer-motion';
import PizzaCard from './PizzaCard';
import { SkeletonCard } from '../ui/Skeleton';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function PizzaGrid({ pizzas = [], loading = false, skeletonCount = 8 }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!pizzas.length) return null;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      {pizzas.map((pizza) => (
        <motion.div key={pizza._id} variants={item}>
          <PizzaCard pizza={pizza} />
        </motion.div>
      ))}
    </motion.div>
  );
}

export default PizzaGrid;

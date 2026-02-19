export default function Button({ icon, children, onClick, className, animated = true }) {
  const animationClass = animated ? "animate-float" : "";

  return (
    <button
      className={`glass-button text-white rounded-full px-6 py-3 flex items-center gap-2 ${animationClass} ${className}`}
      onClick={onClick}
    >
      {icon}
      <span className="text-sm font-medium">{children}</span>
    </button>
  );
}

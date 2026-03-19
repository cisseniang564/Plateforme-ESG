interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
  onClick?: () => void;
}

export default function Card({ title, children, className = '', footer, onClick }: CardProps) {
  return (
    <div className={`card ${className}`} onClick={onClick}>
      {title && (
        <div className="card-header">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      )}
      <div>{children}</div>
      {footer && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          {footer}
        </div>
      )}
    </div>
  );
}

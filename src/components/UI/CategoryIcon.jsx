import React from 'react';
import * as Icons from 'lucide-react';

export const CategoryIcon = ({ name, size = 18, color = 'currentColor', className = '' }) => {
  const IconComponent = Icons[name] || Icons.CircleDollarSign;
  return <IconComponent size={size} color={color} className={className} />;
};

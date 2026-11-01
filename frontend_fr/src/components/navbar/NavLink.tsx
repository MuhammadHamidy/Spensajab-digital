'use client';

import React, {ReactNode} from 'react';
import Link, {LinkProps} from 'next/link';
import {usePathname} from 'next/navigation';
import {Text} from "@/components/Text";
import {Colors} from "@/components/style-guide/color";

interface NavLinkProps extends LinkProps {
  children: ReactNode;
  className?: string;
}

const NavLink: React.FC<NavLinkProps> = ({href, children, className = '', ...rest}) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link href={href} {...rest} className={className}>
      <Text
        variant="button"
        level="xs"
        style={{color: isActive ? Colors.neutral.n07 : Colors.neutral.n04}}
      >
        {children}
      </Text>
    </Link>
  );
};

export default NavLink;

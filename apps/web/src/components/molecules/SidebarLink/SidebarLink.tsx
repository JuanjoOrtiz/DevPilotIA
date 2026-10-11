import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import styles from './SidebarLink.module.css';

interface SidebarLinkProps {
  /** Ruta interna de la sección. */
  to: string;
  /** Icono decorativo. */
  icon: ReactNode;
  children: ReactNode;
}

/**
 * Enlace a una sección en la barra lateral. Queda marcado, también para los lectores de
 * pantalla (`aria-current`), mientras se está en esa sección o en una página dentro de ella.
 */
export function SidebarLink({ to, icon, children }: SidebarLinkProps) {
  return (
    <NavLink to={to} className={styles.link}>
      {icon}
      {children}
    </NavLink>
  );
}

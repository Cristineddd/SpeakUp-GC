'use client';

import { NotificationBell } from '../notifications/NotificationBell';
import { complainantTopBarClass } from '../../lib/sidebar-styles';

export default function ComplainantTopBar() {
  return (
    <header className={complainantTopBarClass()}>
      <NotificationBell variant="admin" />
    </header>
  );
}

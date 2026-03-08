import { Capacitor } from '@capacitor/core';
import MobileLayout from './MobileLayout';
import DesktopLayout from './DesktopLayout';

export default function AdaptiveLayout({ children }) {
    const platform = Capacitor.getPlatform();

    if (platform === 'android') {
        return <MobileLayout>{children}</MobileLayout>;
    }

    return <DesktopLayout>{children}</DesktopLayout>;
}

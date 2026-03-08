import BottomNav from '../BottomNav';
import Header from '../Header';

export default function MobileLayout({ children }) {
    return (
        <div className="max-w-md mx-auto min-h-screen relative bg-gray-50 pb-16 pt-14 shadow-lg sm:border-x sm:border-gray-200">
            <Header />
            {children}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-white border-t border-gray-200 flex justify-around items-center px-2 py-2">
                <BottomNav />
            </div>
        </div>
    );
}

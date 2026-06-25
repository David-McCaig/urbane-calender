import { ShopProvider } from '@/lib/context/shop-context';
import { Navbar } from '@/components/navbar';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ShopProvider>
      <div className="min-h-screen w-full flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
      </div>
    </ShopProvider>
  );
}

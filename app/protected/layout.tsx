import { ShopProvider } from '@/lib/context/shop-context';
import { Navbar } from '@/components/navbar';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ShopProvider>
      <div className="flex min-h-screen w-full flex-col bg-[#f5f3ef] font-[Arial,Helvetica,sans-serif] text-[#292522]">
        <Navbar />
        <main className="flex-1">{children}</main>
      </div>
    </ShopProvider>
  );
}

import type { Metadata } from "next";
import { Montserrat, Great_Vibes } from "next/font/google";
import "./globals.css";
// 1. IMPORTAMOS EL CEREBRO DEL CARRITO
import { CartProvider } from "../store/useCart"; 

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const greatVibes = Great_Vibes({
  weight: '400',
  variable: "--font-great-vibes",
  subsets: ["latin"],
});

export const metadata = {
  title: 'Lo de Franco',
  description: 'El mejor kiosco de Catamarca. Todo lo que necesitas en un solo lugar.',
  icons: {
    icon: '/logo_v2.png'
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${montserrat.variable} ${greatVibes.variable} antialiased bg-[#FAF7F2] text-[#4A3B32] font-sans`}
      >
        {/* 2. ENVOLVEMOS TODA LA APP CON EL PROVIDER */}
        <CartProvider>
            {children}
        </CartProvider>
      </body>
    </html>
  );
}
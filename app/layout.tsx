export const metadata = { title: "Bodero Store Replenishment Orders" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Inter, system-ui, Arial", background: "#0b1020", color: "white" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>{children}</div>
      </body>
    </html>
  );
}

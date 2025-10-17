
const Footer = () => {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left */}
        <div className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} <span className="font-semibold text-foreground">Docscan</span>. All rights reserved.
        </div>

      </div>
    </footer>
  );
};

export default Footer;

// Rendered once in the root layout, so it shows on every page — login,
// signup, admin, scan, the public venue/check-in pages, all of it.
export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border py-4 px-4 text-center text-xs text-muted">
      <p>
        Powered by{" "}
        <a
          href="https://linkpii.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground hover:text-primary"
        >
          Linkpii
        </a>{" "}
        · linkpii.com · 0247 747 624
      </p>
    </footer>
  );
}

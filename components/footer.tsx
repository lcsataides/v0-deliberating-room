export default function Footer() {
  return (
    <footer className="py-6 px-4 border-t bg-white/80 backdrop-blur-sm relative z-10">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
        <div className="flex items-center gap-2 mb-2 md:mb-0">
          <span>Deliberating Room - A planning poker application</span>
        </div>
        <div className="flex items-center gap-4">
          <span>v2.0.0</span>
        </div>
      </div>
    </footer>
  )
}

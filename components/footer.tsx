import { Github } from "lucide-react"

export default function Footer() {
  return (
    <footer className="py-6 px-4 border-t bg-white/80 backdrop-blur-sm relative z-10">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
        <div className="flex items-center gap-2 mb-2 md:mb-0">
          <span>Made by Lucas Ataides as an experiment. 2025</span>
        </div>
        <div className="flex items-center gap-4">
          <span>v1.0.0</span>
          <a
            href="https://github.com/lucasataides"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            <Github size={16} />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </footer>
  )
}

// src/components/SocialLinks.tsx
import { Github, Linkedin } from 'lucide-react';

export function SocialLinks() {
  return (
    <div className="mt-auto pt-6 pb-4 px-4 border-t border-neutral-700">
      <div className="flex justify-center gap-4">
        {/* Enlace de GitHub */}
        <a // <-- Aquí faltaba la etiqueta inicial <a>
          href="https://github.com/Fjgl96"
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-400 hover:text-white transition-colors"
          aria-label="GitHub"
        >
          <Github className="w-5 h-5" />
        </a> {/* <-- Aquí faltaba la etiqueta de cierre </a> */}
        
        {/* Enlace de LinkedIn */}
        <a // <-- Aquí faltaba la etiqueta inicial <a>
          href="https://www.linkedin.com/in/fguerrerol01/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-400 hover:text-blue-400 transition-colors"
          aria-label="LinkedIn"
        >
          <Linkedin className="w-5 h-5" />
        </a> {/* <-- Aquí faltaba la etiqueta de cierre </a> */}
      </div>
      
      <p className="text-center text-xs text-neutral-500 mt-2">
        Hecho por Francisco Guerrero
      </p>
    </div>
  );
}
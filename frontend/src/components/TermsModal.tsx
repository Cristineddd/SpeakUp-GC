import React, { useState } from 'react'
import { X } from 'lucide-react'

interface TermsModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-background rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto border border-border/50">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border/30 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {children}
        </div>

        {/* Footer */}
        <div className="border-t border-border/30 px-6 py-4 bg-muted/20 sticky bottom-0">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold py-2.5 rounded-lg hover:shadow-lg transition-all duration-300"
          >
            Got it, close
          </button>
        </div>
      </div>
    </div>
  )
}

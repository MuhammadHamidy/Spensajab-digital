'use client';

import React, { useEffect, useRef } from 'react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
  footerActions,
}) {
  const modalRef = useRef(null);

  // Keyboard trap Tab & Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
        }}
        className={`w-full ${maxWidth} bg-white border border-[#E2E8F0] rounded-[10px] overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8F0]">
          <h3 id="modal-title" className="text-[16px] font-semibold text-[#0F172A]">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer text-base"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 text-sm text-[#0F172A]">{children}</div>

        {/* Footer Actions */}
        {footerActions && (
          <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
}

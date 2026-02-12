import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const Accordion = ({ items = [], className = '' }) => {
    const defaultOpenIds = useMemo(
        () => new Set(items.filter((item) => item.defaultOpen).map((item) => item.id)),
        [items]
    );
    const [openIds, setOpenIds] = useState(defaultOpenIds);

    const toggle = (id) => {
        setOpenIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {items.map((item) => {
                const isOpen = openIds.has(item.id);
                return (
                    <div key={item.id} className="border border-slate-100 rounded-2xl overflow-hidden">
                        <button
                            type="button"
                            onClick={() => toggle(item.id)}
                            className="w-full flex items-center justify-between px-5 py-4 bg-white text-left"
                            aria-expanded={isOpen}
                            aria-controls={`accordion-${item.id}`}
                        >
                            <span className="text-sm font-semibold text-slate-700">{item.title}</span>
                            <ChevronDown
                                size={18}
                                className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            />
                        </button>
                        {isOpen && (
                            <div id={`accordion-${item.id}`} className="px-5 pb-5 pt-2">
                                {item.content}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default Accordion;

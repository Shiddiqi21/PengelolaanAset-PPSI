import { forwardRef } from 'react';

/**
 * Dropdown bergaya sama dengan TextInput. Isi dengan <option>.
 */
export default forwardRef(function SelectInput({ className = '', children, ...props }, ref) {
    return (
        <select
            {...props}
            ref={ref}
            className={
                'rounded-lg border-line bg-white text-ink-900 focus:border-brand-600 focus:ring-brand-600 ' + className
            }
        >
            {children}
        </select>
    );
});

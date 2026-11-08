import {useId, useState} from 'react';
import {Eye, EyeOff} from 'lucide-react';

export default function PasswordField({label, error, id: suppliedId, ...props}) {
  const generatedId = useId();
  const id = suppliedId || `password-${generatedId}`;
  const [visible, setVisible] = useState(false);
  const description = [props['aria-describedby'], error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    <div className="password-control">
      <input {...props} id={id} type={visible ? 'text' : 'password'}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={description} spellCheck={false} autoCapitalize="none" />
      <button type="button" className="password-toggle" disabled={props.disabled}
        aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
        aria-controls={id} aria-pressed={visible} onClick={() => setVisible(value => !value)}>
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
    {error && <span className="field-error" id={`${id}-error`}>{error}</span>}
  </div>;
}

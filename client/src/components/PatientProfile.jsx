import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {api} from '../api';
import {useAuth} from '../hooks/useAuth';
export default function PatientProfile() {
  const {session,refresh}=useAuth(),navigate=useNavigate();
  const [name,setName]=useState(session.user.name),[phone,setPhone]=useState(session.user.phone || ''),[currentPassword,setCurrentPassword]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  async function save(event,security=false) {
    event.preventDefault();setError('');setNotice('');
    if (security && password!==confirmation) {setError('The new passwords do not match.');return;}
    setBusy(true);
    try {
      await api(`/auth/patient/${security ? 'password' : 'profile'}`,{method:'PUT',body:security ? {currentPassword,password} : {name,phone}});
      if (security) {await refresh();navigate('/patient/sign-in?passwordChanged=1');}
      else {setNotice('Profile saved. Existing appointment contact details stay as booked.');await refresh({quiet:true});}
    } catch(error) {setError(error.message);}finally{setBusy(false);}
  }
  return <div className="patient-profile-editor">{error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}<form onSubmit={event=>save(event)}><fieldset disabled={busy}><label className="field">Full name<input required maxLength={150} autoComplete="name" value={name} onChange={event=>setName(event.target.value)} /></label><label className="field">Phone number<input type="tel" required maxLength={30} autoComplete="tel" value={phone} onChange={event=>setPhone(event.target.value)} /></label><p>Account email: {session.user.email || 'No email address set'}</p><p className="field-hint">Account-email changes will be available after email verification is enabled. You can use a different appointment contact email when booking.</p><button className="button" disabled={busy}>Save profile</button></fieldset></form>
    {!session.user.ownerAccess && <form onSubmit={event=>save(event,true)}><fieldset disabled={busy}><h3>Change password</h3><label className="field">Current password<input type="password" required maxLength={72} autoComplete="current-password" value={currentPassword} onChange={event=>setCurrentPassword(event.target.value)} /></label><label className="field">New password<input type="password" required minLength={12} maxLength={72} autoComplete="new-password" value={password} onChange={event=>setPassword(event.target.value)} /></label><label className="field">Confirm new password<input type="password" required minLength={12} maxLength={72} autoComplete="new-password" value={confirmation} onChange={event=>setConfirmation(event.target.value)} /></label><p className="field-hint">Use at least 12 characters, up to 72 UTF-8 bytes. Saving signs you out on every device.</p><button className="button secondary" disabled={busy}>Save new password and sign out</button></fieldset></form>}
  </div>;
}

import { useState } from "react"
import { signIn,signUp,emailConfirmation,resendCode,forgotPassword,resetPassword } from "../auth/cognito";
import { CodeInput } from "./codeInput";
export function SignInPage({setLogStatus}){
    const [mode,setMode] = useState("SignIn")
    const[password,setPassword] = useState();
    const[newPassword,setNewPassword]=useState();
    const[username,setUserName] = useState();
    const[code,setCode]=useState();
    const[err,setErr]=useState("");
    const[info,setInfo]=useState("");

    async function handleSign(e) {
    e.preventDefault();
    setErr("");
    setInfo("");
    try{
     await signIn(username,password)
     setLogStatus("Logged")

    }catch(err){
        if (err.name === "UserNotConfirmedException" || err.code === "UserNotConfirmedException") {
            try { await resendCode(username); } catch (resendErr) { console.log(resendErr); }
            setInfo("Your email isn't confirmed yet. We've sent you a new code.");
            setMode("EmailConfirmatation");
            return;
        }
        setErr(err.message);
        console.log(err)
    }
    }


    async function handleForPassword(e){
        e.preventDefault(e);
        try{
           await forgotPassword(username);
           setMode("ForgotPasswordCode")
        }catch(err){
             setErr(err.message)
             console.log(err)
            
        }
    }

    async function handleFPCode(e){
        e.preventDefault(e);
        try{
           await resetPassword(username,code,newPassword);
           setMode("SignIn");
        }catch(err){
             setErr(err.message)
             console.log(err)
        }
    }
    async function handleEcon(e){
        e.preventDefault();
        try{
            await emailConfirmation(username,code);
            setMode("SignIn")
        }catch(err){
             setErr(err.message);
             console.log(err)
        }
    }
    async function handleSignUp(e){
    e.preventDefault();
    setErr("");
    try{
        await signUp(username,password);
        setMode("EmailConfirmatation")
    }catch(err){
        if (err.name === "UsernameExistsException" || err.code === "UsernameExistsException") {
            setErr("An account with this email already exists. Try signing in, or use Forgot password.");
            return;
        }
        setErr(err.message);
        console.log(err)
    }
   }
    if(mode === "SignUp"){
        return(
        <div className="auth">
            <header className="hero">
                <p className="eyebrow">New here</p>
                <h1 className="hero-title">Create your account</h1>
                <p className="hero-sub">
                    Use your email and choose a password with at least 8 characters,
                    including upper case, lower case and a number.
                </p>
            </header>

            <section className="card auth-card">
                <form onSubmit={handleSignUp} className="auth-form">
                    <div className="auth-field">
                        <label>Email</label>
                        <input type="email" placeholder="Email" value={username} onChange={(e)=>{setUserName(e.target.value)}} / >
                    </div>
                    <div className="auth-field">
                        <label>Password</label>
                        <input type="password" placeholder="Password" value={password} onChange={(e)=>{setPassword(e.target.value)}} / >
                    </div>
                    {info && <p className="auth-info">{info}</p>}
                    {err && <p role="alert" className="error">{err}</p>}

                    <button type="submit" className="btn btn--primary auth-submit">Create account</button>

                    <div className="auth-links auth-links--center">
                        <span className="auth-hint">Already have an account?</span>
                        <button type="button" className="btn btn--ghost btn--link" onClick={() => {setMode("SignIn")}}>Sign in</button>
                    </div>
                </form>
            </section>
        </div>
        )
    }

            
    if(mode === "EmailConfirmatation"){
        return(
        <div className="auth">
            <header className="hero">
                <p className="eyebrow">Check your inbox</p>
                <h1 className="hero-title">Enter the code</h1>
                <p className="hero-sub">We sent a 6-digit code to {username}. It can take a minute to arrive.</p>
            </header>

            <section className="card auth-card">
                <form onSubmit={handleEcon} className="auth-form">
                    <div className="auth-field auth-field--code">
                        <label>Code</label>
                        <CodeInput setCode={setCode} />
                    </div>
                    {info && <p className="auth-info">{info}</p>}
                    {err && <p role="alert" className="error">{err}</p>}

                    <button type="submit" className="btn btn--primary auth-submit">Confirm</button>

                    <div className="auth-links auth-links--center">
                        <span className="auth-hint">Didn't get it?</span>
                        <button type="button" className="btn btn--ghost btn--link" onClick={handleResend}>Resend</button>
                    </div>
                </form>
            </section>
        </div>
        )
    }
    
   

    if(mode === "ForgotPassword"){
         return(
            <div className="auth">
                <header className="hero">
                    <p className="eyebrow">Account recovery</p>
                    <h1 className="hero-title">Forgot your password?</h1>
                    <p className="hero-sub">Enter your email and we'll send you a code to reset it.</p>
                </header>

                <section className="card auth-card">
                    <form onSubmit={handleForPassword} className="auth-form">
                        <div className="auth-field">
                            <label>Email</label>
                            <input type="email"  value={username} onChange={(e)=>{setUserName(e.target.value)}} / >
                        </div>
                        {info && <p className="auth-info">{info}</p>}
                        {err && <p role="alert" className="error">{err}</p>}

                        <button type="submit" className="btn btn--primary auth-submit">Send code</button>

                        <div className="auth-links auth-links--center">
                            <button type="button" className="btn btn--ghost btn--link" onClick={() => {setMode("SignIn")}}>Back to sign in</button>
                        </div>
                    </form>
                </section>
            </div>
         )
    }
    if(mode === "ForgotPasswordCode"){
         return(
            <div className="auth">
                <header className="hero">
                    <p className="eyebrow">Almost there</p>
                    <h1 className="hero-title">Set a new password</h1>
                    <p className="hero-sub">Enter the code we emailed you, then choose a new password.</p>
                </header>

                <section className="card auth-card">
                    <form onSubmit={handleFPCode} className="auth-form">
                        <div className="auth-field">
                            <label>New Password </label>
                            <input type="Password"  value={newPassword} onChange={(e)=>{setNewPassword(e.target.value)}} / >
                        </div>
                        <div className="auth-field auth-field--code">
                            <label>Confirmation Code</label>
                            <CodeInput setCode={setCode} />
                        </div>
                        {info && <p className="auth-info">{info}</p>}
                        {err && <p role="alert" className="error">{err}</p>}

                        <button type="submit" className="btn btn--primary auth-submit">Reset password</button>
                    </form>
                </section>
            </div>
         )
    }
    return(
        
        <div className="auth">
            <header className="hero">
                <p className="eyebrow">Welcome back</p>
                <h1 className="hero-title">Sign in</h1>
                <p className="hero-sub">Pick up where you left off and see your tasks.</p>
            </header>

            <section className="card auth-card">
                <form onSubmit={handleSign} className="auth-form">
                    <div className="auth-field">
                        <label>Email</label>
                        <input type="email" placeholder="Email" value={username} onChange={(e)=>{setUserName(e.target.value)}} / >
                    </div>
                    <div className="auth-field">
                        <label>Password</label>
                        <input type="password" placeholder="Password" value={password} onChange={(e)=>{setPassword(e.target.value)}} / >
                    </div>
                    {info && <p className="auth-info">{info}</p>}
                    {err && <p role="alert" className="error">{err}</p>}

                    <button type="submit" className="btn btn--primary auth-submit">Sign in</button>

                    <div className="auth-links">
                        <button type="button" className="btn btn--ghost" onClick={() => {setMode("SignUp")}} >Create account</button>
                        <button type="button" className="btn btn--ghost" onClick={() => {setMode("ForgotPassword")}} >Forgot password?</button>
                    </div>
                </form>
            </section>
        </div>
    )
}
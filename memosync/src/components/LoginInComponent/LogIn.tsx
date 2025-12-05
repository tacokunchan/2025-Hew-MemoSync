'use client';

import React from "react";
import styles from './LogIn.module.css';


const LogInPageComponent = () => {

    const [email, setEmail] = React.useState<string>('');
    const [password, setPassword] = React.useState<string>('');

    const handleLogIn = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log('ログインボタンがクリックされました');
        const res = await fetch("/api/users/Login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email,password }),
        });


        if (!res || !res.ok) {
            console.error("ログインエラー:", res?.statusText);
            return;
        }


    }


    return (
        <div>
            <h1>Log In Page</h1>
            <form onSubmit={handleLogIn}>
                <label>
                    Email
                    <input type="text" name="email" onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label>
                    Password
                    <input type="password" name="password" onChange={(e) => setPassword(e.target.value)} />
                </label>
                <input type="submit" value="Log In" />

            </form>






        </div>
    );
}

export default LogInPageComponent;
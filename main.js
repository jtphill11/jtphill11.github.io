// main.js
import { UserManager } from "oidc-client-ts";

// Cognito configuration
const cognitoAuthConfig = {
    authority: "https://auth.bullride.us",           // Your custom domain
    client_id: "381m2et8aa0j89at1na8lm1l62",        // Your App Client ID from Cognito
    redirect_uri: "https://bullride.us/dashboard.html", // Where users go after login
    response_type: "code",
    scope: "openid email profile"
};

// Create a UserManager instance
export const userManager = new UserManager({
    ...cognitoAuthConfig,
});

// Function to log out users
export async function signOutRedirect() {
    const clientId = "381m2et8aa0j89at1na8lm1l62";
    const logoutUri = "https://bullride.us/"; // Where users go after logout
    const cognitoDomain = "https://auth.bullride.us";
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
}

// Handle the callback from Cognito after login
if (window.location.pathname === "/dashboard.html") {
    userManager.signinCallback().then(user => {
        if (user) {
            document.getElementById("email").textContent = user.profile?.email;
            document.getElementById("access-token").textContent = user.access_token;
            document.getElementById("id-token").textContent = user.id_token;
            document.getElementById("refresh-token").textContent = user.refresh_token;
        }
    }).catch(err => console.error("Error during signin callback:", err));
}

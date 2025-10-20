// main.js
import { UserManager } from "oidc-client-ts";

// Cognito configuration
const cognitoAuthConfig = {
    authority: "https://auth.bullride.us",        // your custom domain
    client_id: "381m2et8aa0j89at1na8lm1l62",     // replace with your App Client ID
    redirect_uri: "https://bullride.us/dashboard",
    response_type: "code",
    scope: "openid email phone"
};

// create a UserManager instance
export const userManager = new UserManager({
    ...cognitoAuthConfig,
});

// sign out function
export async function signOutRedirect() {
    const clientId = "381m2et8aa0j89at1na8lm1l62";   // your App Client ID
    const logoutUri = "https://bullride.us/";         // page to redirect after logout
    const cognitoDomain = "https://auth.bullride.us"; // your custom domain
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
};

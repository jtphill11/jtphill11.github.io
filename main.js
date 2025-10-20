// main.js
import { UserManager } from "oidc-client-ts";

// Cognito OIDC configuration
const cognitoAuthConfig = {
  authority: "https://auth.bullride.us",         // your custom domain
  client_id: "381m2et8aa0j89at1na8lm1l62",      // your Cognito App Client ID
  redirect_uri: "https://bullride.us/dashboard", // where users are redirected after login
  response_type: "code",                         // Authorization code flow
  scope: "openid email profile"                  // scopes to request
};

// Create a UserManager instance
export const userManager = new UserManager({
  ...cognitoAuthConfig,
});

// Function to handle logout
export async function signOutRedirect() {
  const clientId = "381m2et8aa0j89at1na8lm1l62"; 
  const logoutUri = "https://bullride.us/";      // where users go after logout
  const cognitoDomain = "https://auth.bullride.us";
  window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
}

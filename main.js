// main.js
import { UserManager } from "https://cdn.jsdelivr.net/npm/oidc-client-ts@2.2.3/+esm";

// Cognito OIDC configuration
const cognitoAuthConfig = {
  authority: "https://auth.bullride.us",
  client_id: "381m2et8aa0j89at1na8lm1l62",
  redirect_uri: "https://bullride.us/dashboard",
  response_type: "code",
  scope: "openid email profile"
};

// Create a UserManager instance
export const userManager = new UserManager({
  ...cognitoAuthConfig,
});

// Function to handle logout
export async function signOutRedirect() {
  const clientId = "381m2et8aa0j89at1na8lm1l62";
  const logoutUri = "https://bullride.us/";
  const cognitoDomain = "https://auth.bullride.us";
  window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
}

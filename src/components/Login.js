import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  InputAdornment,
  IconButton,
  CircularProgress,
  Fade,
  Alert
} from "@mui/material";
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff
} from "@mui/icons-material";
import oxfordLogo from '../assets/oxford-logo.png';

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Sign in with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user role from the login collection
      const loginQuery = query(
        collection(db, "users", "usersData", "login"),
        where("email", "==", email)
      );

      const querySnapshot = await getDocs(loginQuery);
      
      if (querySnapshot.empty) {
        throw new Error("User not found in the system.");
      }
      
      // Get the user document and extract role
      const userData = querySnapshot.docs[0].data();
      const userRole = userData.role;
      
      if (!userRole) {
        throw new Error("User role not defined.");
      }
      
      console.log("User authenticated with role:", userRole);
      
      // Store role in localStorage for future use
      localStorage.setItem("role", userRole);
      
      // Redirect based on role
      switch(userRole.toLowerCase()) {
        case "admin":
          localStorage.setItem("user", userRole.toLowerCase());
          navigate("/admin");
          break;
        case "teacher":
          localStorage.setItem("user", userRole.toLowerCase());
          navigate("/teacher");
          break;
        case "student":
          navigate("/student");
          break;
        default:
          throw new Error(`Unknown role: ${userRole}`);
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container maxWidth="sm" sx={{ display: "flex", height: "100vh", alignItems: "center" }}>
      <Fade in={true} timeout={1000}>
        <Paper
          elevation={8}
          sx={{
            width: "100%",
            p: { xs: 3, md: 5 },
            borderRadius: 2,
            background: "linear-gradient(145deg, #ffffff 0%, #f5f7fa 100%)",
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "5px",
              background: "#011E41",
            }
          }}
        >
          <Box
            component="div"
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mb: 4
            }}
          >
            <Box
              component="div"
              sx={{
                width: 180,
                height: 'auto',
                mb: 3,
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <img
                src={oxfordLogo}
                alt="Oxford University Press"
                style={{
                  maxWidth: '100%',
                  height: 'auto'
                }}
              />
            </Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: "#011E41" }}>
              Welcome Back
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              Sign in to access your account
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleLogin} sx={{ mt: 2 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: "#011E41" }} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: "#011E41" }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ mb: 3 }}
            />

            {error && (
              <Alert severity="error" sx={{ mb: 3, animation: "fadeIn 0.5s" }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 1,
                mb: 2,
                py: 1.5,
                backgroundColor: "#011E41",
                "&:hover": {
                  backgroundColor: "#032b5a",
                },
                fontSize: "1rem",
                textTransform: "none",
                borderRadius: 1.5,
                boxShadow: "0 4px 12px rgba(1, 30, 65, 0.2)",
                position: "relative",
                overflow: "hidden",
                transition: "all 0.3s ease",
                "&::after": {
                  content: '""',
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  top: 0,
                  left: 0,
                  background: "rgba(255, 255, 255, 0.1)",
                  transition: "all 0.3s ease",
                  transform: "translateX(-100%)",
                },
                "&:hover::after": {
                  transform: "translateX(0)"
                }
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: "white" }} />
              ) : (
                "Sign In"
              )}
            </Button>

            <Box sx={{ mt: 3, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">
                © {new Date().getFullYear()} Oxford University Press
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Fade>
    </Container>
  );
};

// Style for animation - unchanged
const styles = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

// Insert styles - unchanged
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

export default Login;

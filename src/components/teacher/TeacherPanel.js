import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Container,
  Tooltip,
  Zoom,
  Grow,
  Button,
} from "@mui/material";
import { 
  MenuBook as BookIcon, 
  QuestionAnswer as QuestionBankIcon, 
  Quiz as QuizIcon,
  Logout as LogoutIcon,
  AccountCircle as ProfileIcon,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
// Import the Oxford logo
import oxfordLogo from "../../assets/oxford-logo.png";

// Custom styled Paper component for tiles
const FeatureTile = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: "center",
  color: theme.palette.text.primary,
  height: "200px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "all 0.3s ease-in-out",
  backgroundColor: "#FFFFFF",
  position: "relative",
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    height: "4px",
    background: "#011E41",
    transform: "scaleX(0)",
    transformOrigin: "100% 0",
    transition: "transform 0.4s ease",
  },
  "&:hover": {
    transform: "translateY(-8px)",
    boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
    "&::before": {
      transform: "scaleX(1)",
      transformOrigin: "0 0",
    },
  },
  "& .MuiSvgIcon-root": {
    fontSize: "4rem",
    marginBottom: theme.spacing(2),
    color: "#011E41",
  },
}));

const TeacherPanel = () => {
  const navigate = useNavigate();
  const [hoveredTile, setHoveredTile] = useState(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const features = [
    {
      id: "question-bank",
      title: "Create Question Bank",
      icon: <QuestionBankIcon />,
      description: "Develop questions for assessments and practice tests",
      path: "/teacher/question-bank",
    },
    {
      id: "generate-quiz",
      title: "Generate Quiz",
      icon: <QuizIcon />,
      description: "Create quizzes from your question banks for students",
      path: "/teacher/generate-quiz",
    },
    {
      id: "view-books",
      title: "View Books",
      icon: <BookIcon />,
      description: "Access and manage the library of digital books",
      path: "/teacher/view-books",
    },
    { 
      id: "profile", 
      title: "Profile", 
      icon: <ProfileIcon />,
      description: "View and update your profile information",
      path: "/profile",
    },
    { 
      id: "view-quiz", 
      title: "View Quizzes", // Fixed spelling
      icon: <QuizIcon />, // Changed icon to QuizIcon
      description: "Access and manage your previously created quizzes",
      path: "/teacher/view-quiz", // Updated path to match the new component
    }, 
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ flexGrow: 1, mt: 4, mb: 4 }}>
        <Box sx={{ 
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4
        }}>
          {/* Logo on the left */}
          <Box sx={{ width: "150px" }}>
            <img 
              src={oxfordLogo} 
              alt="Oxford University Press" 
              style={{ 
                height: "90px", 
                maxWidth: "100%" 
              }} 
            />
          </Box>
          
          {/* Title in the middle */}
          <Typography 
            variant="h5" 
            component="h1" 
            sx={{ 
              color: "#011E41", 
              fontWeight: "bold",
              textAlign: "center"
            }}
          >
            Teacher Dashboard
          </Typography>
          
          {/* Logout button on the right */}
          <Box sx={{ width: "150px", display: "flex", justifyContent: "flex-end" }}>
            <Button 
              variant="outlined"
              color="primary"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{
                borderColor: "#011E41",
                color: "#011E41",
                "&:hover": {
                  backgroundColor: "rgb(212, 0, 0)",
                  borderColor: "#011E41",
                  color: "#FFFFFF"
                }
              }}
            >
              Logout
            </Button>
          </Box>
        </Box>
        
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={feature.id}>
              <Grow
                in={true}
                style={{ transformOrigin: "0 0 0" }}
                timeout={(index + 1) * 300}
              >
                <div>
                  <Tooltip
                    title={feature.description}
                    placement="top"
                    arrow
                    TransitionComponent={Zoom}
                    enterDelay={500}
                    leaveDelay={200}
                  >
                    <FeatureTile
                      elevation={3}
                      onClick={() => navigate(feature.path)}
                      onMouseEnter={() => setHoveredTile(feature.id)}
                      onMouseLeave={() => setHoveredTile(null)}
                    >
                      {feature.icon}
                      <Typography variant="h6" component="h2">
                        {feature.title}
                      </Typography>
                      {hoveredTile === feature.id && (
                        <Typography 
                          variant="body2" 
                          color="textSecondary" 
                          sx={{ mt: 1, opacity: 0.8 }}
                        >
                          Click to access
                        </Typography>
                      )}
                    </FeatureTile>
                  </Tooltip>
                </div>
              </Grow>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default TeacherPanel;

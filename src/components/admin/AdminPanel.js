import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Container,
  Tooltip,
  Zoom,
  Grow,
  Button
} from "@mui/material";
import { 
  PersonAdd as CreateUserIcon,
  Edit as EditUserIcon,
  Category as CategoryIcon,
  School as GradesIcon,
  BookmarkAdd as SubjectsIcon,
  MenuBook as CreateBookIcon,
  QuestionAnswer as QuestionsIcon,
  AccountCircle as ProfileIcon,
  Logout as LogoutIcon
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
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

const AdminPanel = () => {
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

  const functionalities = [
    { 
      id: "create-user", 
      name: "Create User", 
      route: "/create-user",
      icon: <CreateUserIcon />,
      description: "Add new users to the system with specific roles and permissions"
    },
    { 
      id: "edit-user", 
      name: "Edit User", 
      route: "/edit-user",
      icon: <EditUserIcon />,
      description: "Modify existing user details, roles, and permissions"
    },
    { 
      id: "create-categories", 
      name: "Create Categories", 
      route: "/create-categories",
      icon: <CategoryIcon />,
      description: "Add and manage content categories for organization"
    },
    { 
      id: "create-grades", 
      name: "Create Grades", 
      route: "/create-grades",
      icon: <GradesIcon />,
      description: "Set up educational grades and their associated departments"
    },
    { 
      id: "add-subjects", 
      name: "Add Subjects", 
      route: "/add-subjects",
      icon: <SubjectsIcon />,
      description: "Create and organize subjects for different grades and departments"
    },
    { 
      id: "create-book", 
      name: "Create Book", 
      route: "/admin/create-book",
      icon: <CreateBookIcon />,
      description: "Create and manage books for different grades and subjects"
    },
    { 
      id: "view-questions", 
      name: "View Questions", 
      route: "/view-questions",
      icon: <QuestionsIcon />,
      description: "Browse and manage all questions in the system"
    },
    { 
      id: "profile", 
      name: "Profile", 
      route: "/profile",
      icon: <ProfileIcon />,
      description: "View and update your administrator profile"
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
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
          Administrator Dashboard
        </Typography>
        
        {/* Logout button on the right */}
        <Box sx={{ width: "150px", display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="outlined"
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

      <Box sx={{ flexGrow: 1, mt: 4, mb: 4 }}>
        <Grid container spacing={4}>
          {functionalities.map((feature, index) => (
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
                      onClick={() => navigate(feature.route)}
                      onMouseEnter={() => setHoveredTile(feature.id)}
                      onMouseLeave={() => setHoveredTile(null)}
                    >
                      {feature.icon}
                      <Typography variant="h6" component="h2">
                        {feature.name}
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

export default AdminPanel;

import React, { useState, useEffect } from "react";
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
  Button,
  Avatar,
  Divider
} from "@mui/material";
import { 
  PersonAdd as CreateUserIcon,
  People as UserAccountsIcon,
  QuestionAnswer as CreateQuestionsIcon,
  ManageSearch as ViewQuestionsIcon,
  AccountCircle as ProfileIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import oxfordLogo from "../../assets/oxford-logo.png";

// Custom styled Paper component for feature tiles
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

const InfoCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  display: "flex",
  alignItems: "center",
  backgroundColor: "rgb(242, 245, 249)",
  height: "100%",
}));

const Dashboard = () => {
  const navigate = useNavigate();
  const [hoveredTile, setHoveredTile] = useState(null);
  const [user, setUser] = useState(null);
  const [schoolName, setSchoolName] = useState("Your School");
  const [stats, setStats] = useState({
    teachers: 0,
    students: 0,
    questions: 0,
    quizzes: 0
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          // Get admin profile
          const adminQuery = query(
            collection(db, "users", "usersData", "admins"),
            where("email", "==", currentUser.email)
          );
          
          const querySnapshot = await getDocs(adminQuery);
          if (!querySnapshot.empty) {
            const adminData = querySnapshot.docs[0].data();
            if (adminData.schoolName) {
              setSchoolName(adminData.schoolName);
            }
          }

          // Fetch dashboard stats (mock data for now)
          // In a real application, these would come from Firestore queries
          setStats({
            teachers: 12,
            students: 156,
            questions: 450,
            quizzes: 28
          });
        } catch (error) {
          console.error("Error fetching admin data:", error);
        }
      } else {
        navigate("/");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("role"); // Clear role from localStorage
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Get user initials for avatar
  const getInitials = (name) => {
    if (!name) return "A";
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  const functionalities = [
    { 
      id: "create-user", 
      name: "Create Users", 
      route: "/school-admin/create-user",
      icon: <CreateUserIcon />,
      description: "Add new teachers and staff members to your school"
    },
    { 
      id: "user-accounts", 
      name: "User Accounts", 
      route: "/school-admin/user-accounts",
      icon: <UserAccountsIcon />,
      description: "Manage all user accounts in your school"
    },
    { 
      id: "create-questions", 
      name: "Create Questions", 
      route: "/school-admin/create-questions",
      icon: <CreateQuestionsIcon />,
      description: "Add new questions to the question bank"
    },
    { 
      id: "view-questions", 
      name: "View Questions", 
      route: "/school-admin/view-questions",
      icon: <ViewQuestionsIcon />,
      description: "Browse and manage all questions created by your school"
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
      {/* Header with logo, title, and logout button */}
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
        <Box sx={{ textAlign: "center" }}>
          <Typography 
            variant="h5" 
            component="h1" 
            sx={{ 
              color: "#011E41", 
              fontWeight: "bold"
            }}
          >
            School Admin Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {schoolName}
          </Typography>
        </Box>
        
        {/* User info and logout button on the right */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {/* <Box sx={{ mr: 2, textAlign: "right" }}>
            <Typography variant="body2" sx={{ fontWeight: "medium" }}>
              {user?.displayName || user?.email}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              School Administrator
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: "#011E41", mr: 1 }}>
            {getInitials(user?.displayName || user?.email)}
          </Avatar> */}
          <Button
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            size="small"
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

      {/* Stats overview cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <InfoCard elevation={1}>
            <DashboardIcon sx={{ fontSize: "2.5rem", color: "#1976d2", mr: 2 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: "medium", color: "#1976d2" }}>
                {stats.teachers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Teachers
              </Typography>
            </Box>
          </InfoCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <InfoCard elevation={1}>
            <CreateQuestionsIcon sx={{ fontSize: "2.5rem", color: "#f57c00", mr: 2 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: "medium", color: "#f57c00" }}>
                {stats.questions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Questions
              </Typography>
            </Box>
          </InfoCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <InfoCard elevation={1}>
            <ViewQuestionsIcon sx={{ fontSize: "2.5rem", color: "#7b1fa2", mr: 2 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: "medium", color: "#7b1fa2" }}>
                {stats.quizzes}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Quizzes
              </Typography>
            </Box>
          </InfoCard>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }}>
        <Typography variant="overline" sx={{ color: "#011E41", fontWeight: "medium" }}>
          School Administration Tools
        </Typography>
      </Divider>

      {/* Main feature tiles */}
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

      {/* Footer */}
      <Box sx={{ mt: 6, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} Oxford University Press Quiz App | School Admin Portal
        </Typography>
      </Box>
    </Container>
  );
};

export default Dashboard;
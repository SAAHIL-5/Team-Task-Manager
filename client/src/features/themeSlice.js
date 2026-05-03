import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  theme: "light",
};

const applyThemeToDOM = (theme) => {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    toggleTheme: (state) => {
      const newTheme = state.theme === "light" ? "dark" : "light";

      state.theme = newTheme;
      localStorage.setItem("theme", newTheme);

      applyThemeToDOM(newTheme);
    },

    setTheme: (state, action) => {
      const theme = action.payload;

      state.theme = theme;
      localStorage.setItem("theme", theme);

      applyThemeToDOM(theme);
    },

    loadTheme: (state) => {
      const savedTheme = localStorage.getItem("theme") || "light";

      state.theme = savedTheme;

      applyThemeToDOM(savedTheme);
    },
  },
});

export const { toggleTheme, setTheme, loadTheme } = themeSlice.actions;
export default themeSlice.reducer;
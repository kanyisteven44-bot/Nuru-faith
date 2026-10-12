"""Nuru Faith app — safe dashboard starter (no private user data)."""
import streamlit as st

st.set_page_config(page_title="Nuru Faith | Admin Insights", page_icon="💙", layout="wide")
st.title("Nuru Faith — Admin Insights")
st.caption("Reels · Gospel music · Sermons · Artists · Courses")

st.info("Dashboard starter only. Live analytics are not connected yet.")
cols=st.columns(5)
for col,label in zip(cols,["Reels","Songs","Sermons","Artists","Courses"]):
    col.metric(label,"Not connected")
st.subheader("Content management overview")
st.write("Once authenticated access and safe aggregate database views are configured, this dashboard can show verified counts and trends.")
st.warning("Do not use a publicly accessible dashboard for user accounts, messages, prayer requests, or moderation records.")

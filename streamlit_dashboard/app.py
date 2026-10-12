"""Nuru Faith youth app — restricted, aggregate-only Supabase insights."""
import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

import streamlit as st

st.set_page_config(page_title="Nuru Faith | Admin Insights", page_icon="💙", layout="wide")

st.markdown("""<style>
.stApp {background:linear-gradient(140deg,#091525,#102942);color:#eaf4ff}
.block-container {max-width:1220px;padding-top:2.6rem}
div[data-testid="stMetric"] {background:#142f49;border:1px solid #28516b;padding:22px;border-radius:17px}
div[data-testid="stMetricLabel"] {color:#b7cfe2}
.stButton>button {background:#b9ef54;color:#122a24;border-radius:10px;border:0;font-weight:700}
</style>""", unsafe_allow_html=True)

st.title("Nuru Faith — Admin Insights")
st.caption("Youth app · Restricted aggregate content reporting")

try:
    url = str(st.secrets["SUPABASE_URL"]).rstrip("/")
    anon_key = str(st.secrets["SUPABASE_ANON_KEY"])
except (KeyError, FileNotFoundError):
    st.warning("Connection setup required: add SUPABASE_URL and SUPABASE_ANON_KEY in Streamlit Cloud → App settings → Secrets.")
    st.stop()

def post_json(endpoint, payload, access_token=None):
    headers = {"apikey": anon_key, "Content-Type": "application/json"}
    if access_token:
        headers["Authorization"] = "Bearer " + access_token
    req = Request(url + endpoint, data=json.dumps(payload).encode(), headers=headers, method="POST")
    try:
        with urlopen(req, timeout=20) as response:
            return json.loads(response.read().decode())
    except HTTPError as error:
        if error.code in (400, 401, 403):
            raise ValueError("Invalid credentials or insufficient administrator permissions.") from None
        raise ValueError("Supabase request failed. Please try again.") from None
    except URLError:
        raise ValueError("Unable to reach Supabase. Please try again.") from None

if "nuru_access_token" not in st.session_state:
    st.subheader("Administrator sign in")
    st.info("Only Nuru Faith super administrators can view this dashboard. No private member data is displayed.")
    with st.form("admin_login"):
        email = st.text_input("Admin email")
        password = st.text_input("Password", type="password")
        submit = st.form_submit_button("Sign in securely")
    if submit:
        try:
            data = post_json("/auth/v1/token?grant_type=password", {"email":email.strip(),"password":password})
            token = data["access_token"]
            # Permission is enforced server-side by the database RPC.
            post_json("/rest/v1/rpc/nuru_streamlit_admin_counts", {}, token)
            st.session_state["nuru_access_token"] = token
            st.rerun()
        except (ValueError, KeyError):
            st.error("Sign-in failed or this account is not a super administrator.")
    st.stop()

if st.button("Sign out"):
    st.session_state.pop("nuru_access_token", None)
    st.rerun()

try:
    counts = post_json("/rest/v1/rpc/nuru_streamlit_admin_counts", {}, st.session_state["nuru_access_token"])
except ValueError:
    st.session_state.pop("nuru_access_token", None)
    st.error("Your session has expired or you do not have access. Please sign in again.")
    st.stop()

st.success("Connected to Nuru Faith youth app · Supabase live aggregates")
from datetime import datetime, timezone
st.caption("Updated " + datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC") + " · Counts reflect the live database")

st.subheader("Content overview")
primary = [("Reels","reels"),("Music items","songs"),("Podcasts","podcasts"),("Media sources","media_sources"),("Courses","courses")]
for col,(label,key) in zip(st.columns(5),primary):
    col.metric(label, f"{int(counts.get(key,0)):,}")

st.subheader("Approval overview")
for col,(label,key) in zip(st.columns(4),[("Approved media","approved_media"),("Pending media","pending_media"),("Approved sources","approved_sources"),("Pending sources","pending_sources")]):
    col.metric(label, f"{int(counts.get(key,0)):,}")
if int(counts.get("pending_media",0)) > 0:
    st.warning(f"{int(counts['pending_media']):,} media items are awaiting review. This dashboard is read-only; approvals must be handled through authorized moderation workflows.")

st.subheader("Content breakdown")
chart_data = {
    "Music":int(counts.get("songs",0)),
    "Podcasts":int(counts.get("podcasts",0)),
    "Reels":int(counts.get("reels",0)),
    "Devotionals":int(counts.get("devotionals",0)),
    "Scripture series":int(counts.get("scripture_series",0)),
    "Courses":int(counts.get("courses",0)),
}
st.bar_chart(chart_data, horizontal=True)
st.caption("Categories represent different tables and may overlap in subject matter; these are content totals, not engagement statistics.")

st.subheader("Explore the library")
view = st.selectbox("Choose a reporting category", ["All content","Music and podcasts","Learning and Scripture","Sources and channels"])
metrics = {
    "All content":[("Media items","media_items"),("Churches","churches"),("Reels","reels")],
    "Music and podcasts":[("Music","songs"),("Podcasts","podcasts"),("Approved media","approved_media"),("Pending media","pending_media")],
    "Learning and Scripture":[("Courses","courses"),("Devotionals","devotionals"),("Scripture series","scripture_series")],
    "Sources and channels":[("Media sources","media_sources"),("Approved sources","approved_sources"),("Approved YouTube channels","approved_channels")],
}
for col,(label,key) in zip(st.columns(len(metrics[view])),metrics[view]):
    col.metric(label, f"{int(counts.get(key,0)):,}")

with st.expander("Reporting definitions and limitations"):
    st.write("Music and podcasts are classified from media_items.media_type. A separate sermon classification currently has no records; some sermon content may be catalogued as podcasts. Media sources are not necessarily distinct artists. Approval counts use is_approved flags. No private user records are requested.")
    st.write("Super-admin access is enforced by the Supabase database function. This dashboard cannot approve, delete or edit content.")

st.caption("Nuru Faith youth app · Secure, read-only administrative insights")

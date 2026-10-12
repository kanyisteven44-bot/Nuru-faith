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

st.title("✦ Nuru Social Studio")
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

st.success("Connected to Nuru Faith youth app · Live Supabase analytics")
with st.sidebar:
    st.header("✦ Nuru Studio")
    page = st.radio("Workspace", ["Social home", "Overview", "Content intelligence", "Moderation queue", "Growth trends", "System health"])
    if st.button("Refresh live data"):
        st.rerun()
    st.caption("Role: verified super administrator")
    st.caption("All metrics are aggregated. Sensitive personal records are excluded.")

try:
    advanced = post_json("/rest/v1/rpc/nuru_streamlit_admin_advanced", {}, st.session_state["nuru_access_token"])
except ValueError:
    advanced = None
    st.warning("Advanced reporting is temporarily unavailable. Basic insights remain accessible.")

def cards(items):
    for col, (label, value) in zip(st.columns(len(items)), items):
        col.metric(label, f"{int(value or 0):,}")

def category_chart(rows):
    if not rows:
        st.info("No data is available for this chart yet.")
    else:
        st.bar_chart({str(row["name"]): int(row["count"]) for row in rows}, horizontal=True)

def weekly_chart(rows):
    if not rows:
        st.info("No activity recorded in the last 12 weeks.")
    else:
        st.line_chart({str(row["week"]): int(row["count"]) for row in rows})


try:
    social = post_json("/rest/v1/rpc/nuru_streamlit_social_pulse", {}, st.session_state["nuru_access_token"])
except ValueError:
    social = None

if page == "Social home":
    st.header("Community pulse")
    st.caption("Social-platform inspired creator analytics · Real Nuru Faith engagement")
    if social:
        cards([("Posts",social.get("posts")),("Post likes",social.get("post_likes")),("Comments",social.get("post_comments")),("Reel views",social.get("reel_views"))])
        cards([("Reel likes",social.get("reel_likes")),("Follows",social.get("follows")),("Posts · 7d",social.get("posts_week")),("Views · 7d",social.get("views_week"))])
        st.subheader("Social activity · Last 14 days")
        activity = social.get("weekly_activity",[])
        if activity:
            st.line_chart({str(row["day"]):int(row["views"]) for row in activity})
            st.caption("Daily reel views; no private activity details are displayed.")
        else:
            st.info("No activity recorded yet.")
    else:
        st.warning("Social analytics are temporarily unavailable.")
    st.subheader("Creator dashboard")
    cards([("Reels",counts.get("reels")),("Music",counts.get("songs")),("Podcasts",counts.get("podcasts")),("Pending media",counts.get("pending_media"))])
    st.caption("Platform-wide totals, not an individual creator's private account.")

elif page == "Overview":
    st.header("Executive overview")
    cards([("Media library", counts.get("media_items")), ("Music", counts.get("songs")), ("Podcasts", counts.get("podcasts")), ("Reels", counts.get("reels"))])
    cards([("Devotionals", counts.get("devotionals")), ("Scripture series", counts.get("scripture_series")), ("Courses", counts.get("courses")), ("Churches", counts.get("churches"))])
    st.subheader("Publishing and approval")
    cards([("Approved media", counts.get("approved_media")), ("Pending media", counts.get("pending_media")), ("Approved sources", counts.get("approved_sources")), ("Pending sources", counts.get("pending_sources"))])
    if advanced:
        st.subheader("Last 7 days")
        cards([("New media", advanced.get("media_last_7d")), ("New reels", advanced.get("reels_last_7d")), ("Registered profiles", advanced.get("users_total")), ("Administrators", advanced.get("admins_total"))])

elif page == "Content intelligence":
    st.header("Content intelligence")
    st.caption("Classified from the live catalog. A media source is not necessarily a unique artist.")
    cards([("Music", counts.get("songs")), ("Podcasts", counts.get("podcasts")), ("Sources", counts.get("media_sources")), ("Approved channels", counts.get("approved_channels"))])
    if advanced:
        left, right = st.columns(2)
        with left:
            st.subheader("Media formats")
            category_chart(advanced.get("media_categories", []))
        with right:
            st.subheader("Source classifications")
            category_chart(advanced.get("source_kinds", []))
    st.info("The catalog does not currently contain a distinct sermon media_type. Podcast totals must not be presented as verified sermon totals.")

elif page == "Moderation queue":
    st.header("Moderation command center")
    cards([("Media awaiting approval", counts.get("pending_media")), ("Sources awaiting approval", counts.get("pending_sources")), ("Pending reports", advanced.get("pending_reports") if advanced else 0)])
    st.warning("This is a read-only moderation overview. No bulk approval, deletion or role changes are available from this dashboard.")
    st.markdown("**Review priorities**")
    st.write("1. Verify licensing, attribution and content suitability before approving media.")
    st.write("2. Review pending source identities and channel ownership.")
    st.write("3. Handle user reports inside the authenticated Nuru Faith moderation interface.")

elif page == "Growth trends":
    st.header("Growth and publishing trends")
    st.caption("Weekly upload counts over the past 12 weeks; not user activity or listening analytics.")
    if advanced:
        st.subheader("New media by week")
        weekly_chart(advanced.get("weekly_media", []))
        st.subheader("New reels by week")
        weekly_chart(advanced.get("weekly_reels", []))
    else:
        st.info("Advanced trends are not available right now.")

else:
    st.header("System health and data integrity")
    st.success("The protected basic analytics endpoint is responding.")
    st.write("Advanced reporting endpoint:", "Connected" if advanced is not None else "Unavailable")
    st.write("Social analytics endpoint:", "Connected" if social is not None else "Unavailable")
    st.write("Access policy: authenticated super_admin only")
    st.write("Database access: read-only aggregate functions")
    st.write("Member messages, prayer requests, passwords and tokens: never displayed")
    st.write("Data caveats: media sources are not necessarily distinct artists; sermons are not separately classified.")
    if advanced:
        cards([("Registered profiles", advanced.get("users_total")), ("Administrators", advanced.get("admins_total")), ("Media in 7 days", advanced.get("media_last_7d"))])

st.divider()
st.caption("Nuru Faith youth app · Administrator-only insights · No destructive actions")

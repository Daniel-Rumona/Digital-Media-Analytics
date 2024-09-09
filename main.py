import sys
from datetime import date, timedelta, datetime
sys.path.append(r'C:\Users\admin\AppData\Local\Programs\Python\Python312\Lib\site-packages')

# Streamlit related imports
import streamlit as st
import streamlit.components.v1 as components
import streamlit_highcharts as stc
from streamlit_option_menu import option_menu
from streamlit_extras.grid import grid
from streamlit_extras.metric_cards import style_metric_cards
from streamlit_date_picker import date_range_picker, date_picker, PickerType
# Set page config at the very beginning
st.set_page_config(page_title='Social Media Analytics', page_icon='💹', layout="wide")

# All other imports
import json
import pandas as pd
import plotly.graph_objects as go
from textblob import TextBlob
import numpy as np
import os
from collections import defaultdict
from collections import Counter
import calendar
import random
import google.cloud.translate_v2 as translate
from google.oauth2 import service_account
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import threading
import time
from datetime import datetime, timedelta
from openai import OpenAI
import plotly.express as px

# Configuration
OPENAI_API_KEY = "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"
ASSISTANT_ID = "asst_pBfV7Ge7djC1F5nRxRRDlzXD"

# Initialize OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)


def get_or_create_thread():
    if 'thread_id' not in st.session_state:
        thread = client.beta.threads.create()
        st.session_state.thread_id = thread.id
    return st.session_state.thread_id


def parse_and_render_response(response):
    try:
        data = json.loads(response)
        if 'graph' in data and 'text' in data:
            if data['graph']['type'] == 'bar':
                fig = px.bar(x=data['graph']['x'], y=data['graph']['y'], labels=data['graph'].get('labels', {}))
            elif data['graph']['type'] == 'line':
                fig = px.line(x=data['graph']['x'], y=data['graph']['y'], labels=data['graph'].get('labels', {}))
            elif data['graph']['type'] == 'scatter':
                fig = px.scatter(x=data['graph']['x'], y=data['graph']['y'], labels=data['graph'].get('labels', {}))
            else:
                st.warning(f"Unsupported graph type: {data['graph']['type']}")
                return

            st.plotly_chart(fig)
            st.write(data['text'])
        else:
            st.json(data)
    except json.JSONDecodeError:
        st.write(response)


def query_assistant(query: str):
    thread_id = get_or_create_thread()
    try:
        client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=query
        )

        run = client.beta.threads.runs.create(
            thread_id=thread_id,
            assistant_id=ASSISTANT_ID
        )

        with st.spinner("Assistant is thinking..."):
            while run.status not in ["completed", "failed"]:
                run = client.beta.threads.runs.retrieve(thread_id=thread_id, run_id=run.id)
                if run.status == "failed":
                    st.error("The assistant run failed.")
                    return None

        messages = client.beta.threads.messages.list(thread_id=thread_id)
        return messages.data[0].content[0].text.value

    except Exception as e:
        st.error(f"Error querying assistant: {str(e)}")
        return None


# Helper function to generate a response
def respond(user_input, instruction=""):
    return query_assistant(instruction + user_input)


# Title of the app
st.title(':red[Social] Media :red[Analytics]')



@st.cache_data
def load_data():
    with open("data-sources/Mentions-Data.json") as file:
        data = json.load(file)
    return data


@st.cache_data
def get_unique_platforms(data):
    platforms = set()
    for entity in data.values():
        for mention in entity['mentions']:
            platforms.add(mention['platform'])
    return sorted(platforms)

def filter_mentions_by_date_range(data, target, start_date, end_date):
    filtered_mentions = []
    if target in data:
        filtered_mentions.extend(
            [mention for mention in data[target]['mentions']
             if start_date <= datetime.strptime(mention['date'][:10], '%Y-%m-%d').date() <= end_date]
        )
    return filtered_mentions

def analyze_sentiment(text):
    analysis = TextBlob(text)
    if analysis.sentiment.polarity > 0:
        return 'Positive'
    elif analysis.sentiment.polarity < 0:
        return 'Negative'
    else:
        return 'Neutral'


def perform_sentiment_analysis(mentions):
    sentiments = {'Positive': 0, 'Negative': 0, 'Neutral': 0}
    for mention in mentions:
        sentiment = analyze_sentiment(mention['mention'])
        sentiments[sentiment] += 1
    return sentiments


# Get the path to your JSON file
json_file_path = os.path.join(os.getcwd(), "data-sources", "digital-ma-434202-d2311a8c7167.json")

try:
    # Load credentials
    credentials = service_account.Credentials.from_service_account_file(
        json_file_path,
        scopes=['https://www.googleapis.com/auth/cloud-platform']
    )

    # Initialize the translation client with the credentials
    translation_client = translate.Client(credentials=credentials)

except FileNotFoundError:
    st.error(f"Service account JSON file not found at {json_file_path}. Please check the file path.")
    st.stop()
except Exception as e:
    st.error(f"An error occurred while setting up the Google Cloud client: {str(e)}")
    st.stop()

# Define available languages
LANGUAGES = {
    'English': 'en',
    'Spanish': 'es',
    'French': 'fr',
    'German': 'de',
    'Italian': 'it',
    'Portuguese': 'pt',
    'Russian': 'ru',
    'Japanese': 'ja',
    'Korean': 'ko',
    'Chinese (Simplified)': 'zh-CN',
    'Arabic': 'ar',
    'Hindi': 'hi',
    'Zulu': 'zu',
    'Xhosa': 'xh',
    'Afrikaans': 'af'
}


def translate_text(text, target_language):
    try:
        result = translation_client.translate(text, target_language=target_language)
        return result['translatedText']
    except Exception as e:
        st.error(f"Translation error: {str(e)}")
        return text


def _(message):
    if st.session_state.lang != 'en':
        return translate_text(message, st.session_state.lang)
    return message


def load_translations(lang):
    translations = {
        "dashboard_title": _("Dashboard"),
        "overview": _("Overview"),
        "platform_specific_title": _("Platform Specific"),
        "platform_metrics": _("Platform Metrics"),
        "ai_insights": _("AI Insights"),
        "sentiment_analysis_title": _("Sentiment Analysis"),
        "report_title": _("Report"),
        "sentiment_breakdown": _("Sentiment Breakdown"),
        "world_view_title": _("Geographical View"),
        "live_updates_title": _("Digital Media Analytics Live Updates"),
        "start_stop_button": _("Update View"),
        "select_target_topic": _("Select The Target Topic"),
        "select_target_month": _("Select The Month"),
        "data_view": _("Data View"),
        "gen_ai": _("Gen AI"),
        "current_social_engagements": _("Current Social Engagements"),
        "monthly_social_engagements_metrics": _("Monthly Social Engagements Metrics"),
        "social_media_metrics": _("Social Media Metrics"),
        "platform_performance": _("Platform Performance"),
        "audience_insights": _("Audience Insights"),
        "age_distribution_title": _("Age Group Distribution"),
        "legend_title": _("Age Groups"),
        "download_csv": _("Download CSV"),
        "generate_report": _("Generate Report"),
        "select_time_period": _("Select Time Period"),
        "select_chart_type": _("Select Chart Type"),
        "schedule_automated_reports": _("Schedule Automated Reports")

    }
    return translations

if 'lang' not in st.session_state:
    st.session_state.lang = 'en'

# Add language selection to the sidebar
st.sidebar.title(_("Language Settings"))
selected_language = st.sidebar.selectbox(
        _("Select your preferred language"),
        options=list(LANGUAGES.keys()),
        index=list(LANGUAGES.values()).index(st.session_state.lang)
)
# Update the session state with the selected language
st.session_state.lang = LANGUAGES[selected_language]

# Load translations
translations = load_translations(st.session_state.lang)
# Option menu for navigation
options = [
    translations['dashboard_title'],
    translations['platform_metrics'],
    translations['gen_ai'],
    translations['sentiment_analysis_title'],
    translations['world_view_title'],
    translations['report_title']
]
with st.sidebar:
    # Create the menu
    selected_option = option_menu(
        menu_title="Main Menu",
        options=options,
        icons=["exclude", "slack", "chat-quote", "emoji-smile", 'globe', 'file-earmark-text'],
        menu_icon="cast",
        default_index=0,
        orientation="vertical",
    )

# Determine the index of the selected option
selected_index = options.index(selected_option)
if selected_index == 0:
    # Load the data
    data = load_data()
    # Input for target entity
    target_col, date_range_col = st.columns(2)

    # Determine available date range based on data
    available_dates = sorted(
        {mention['date'][:10] for company in data.values() for mention in company['mentions']}
    )
    if available_dates:
        min_date = datetime.strptime(available_dates[0], '%Y-%m-%d').date()
        max_date = datetime.strptime(available_dates[-1], '%Y-%m-%d').date()
    else:
        min_date = date.today()
        max_date = date.today()

    # Allow users to select a date range
    with date_range_col:
        start_date, end_date = st.date_input(
            "Select Date Range",
            (min_date, max_date),
            min_value=min_date,
            max_value=max_date,
            format="MM/DD/YYYY"
        )


    with target_col:
        target = st.multiselect(translations["select_target_topic"], ['Mr Price', 'KZN Government', 'Edgars'], ["Mr Price"])


    # Count mentions by platform for a given month across all selected targets
    def count_mentions(data, targets, month_key):
        mentions_count = {}
        for target_company in targets:
            if target_company in data:
                for mention in data[target_company]['mentions']:
                    if month_key and month_key in mention['date']:  # Check if month_key is not None
                        platform = mention['platform']
                        if platform in mentions_count:
                            mentions_count[platform] += 1
                        else:
                            mentions_count[platform] = 1
        return mentions_count

        # Ensure target is selected


    if target and start_date and end_date:
        # Count mentions for the selected date range across all targets
        mentions_in_range = []
        for selected_target in target:
            mentions_in_range.extend(filter_mentions_by_date_range(data, selected_target, start_date, end_date))

        # Calculate the previous date range
        range_duration = end_date - start_date
        previous_start_date = start_date - range_duration
        previous_end_date = start_date - timedelta(days=1)

        mentions_in_previous_range = []
        for selected_target in target:
            mentions_in_previous_range.extend(
                filter_mentions_by_date_range(data, selected_target, previous_start_date, previous_end_date))

        style_metric_cards(
            background_color="#00000000",  # Set the desired background color
            border_radius_px=10,  # Set border radius
            border_left_color="deepskyblue",
            border_color="deepskyblue"  # Set the border color
        )

        # Display metrics with platform mention counts and deltas
        if mentions_in_range:
            # Count the number of mentions by platform for the current range
            platform_counts_current = defaultdict(int)
            for mention in mentions_in_range:
                platform = mention['platform']
                platform_counts_current[platform] += 1

            # Count the number of mentions by platform for the previous range
            platform_counts_previous = defaultdict(int)
            for mention in mentions_in_previous_range:
                platform = mention['platform']
                platform_counts_previous[platform] += 1

            # Display platform counts and deltas over the selected date range
            platforms = set(platform_counts_current.keys()).union(set(platform_counts_previous.keys()))
            cols = st.columns(len(platforms))  # Create columns for each platform
            for i, platform in enumerate(platforms):
                current_value = platform_counts_current.get(platform, 0)
                previous_value = platform_counts_previous.get(platform, 0)
                delta_value = current_value - previous_value  # Calculate delta

                # Display metric in the appropriate column
                with cols[i]:
                    st.metric(label=f"{platform}", value=current_value, delta=delta_value)
        else:
            st.warning(f"No data available for the selected date range {start_date} to {end_date}")

        style_metric_cards(
            background_color="#00000000",  # Set the desired background color
            border_radius_px=10,  # Set border radius
            border_left_color="deepskyblue",
            border_color="deepskyblue"  # Set the border color
        )


        def load_live_data():
            # Replace this with your actual data loading logic
            df = pd.DataFrame({
                'date': ['2023-01-01', '2023-01-02', '2023-01-03'],
                'mentions': [100, 200, 300],
                'unique_users': [80, 90, 95],
                'engagement_rate': [60, 62, 64],
                'sentiment_score': [0.7, 0.75, 0.8],
                'total_users': [800, 820, 840],
                'age_group_1824': [20, 22, 24],
                'age_group_2530': [45, 47, 49],
                'age_group_4055': [15, 17, 19],
                'age_group_5565plus': [10, 12, 14]
            })
            return df


        def generate_live_updates(data, speed=1):
            """
            Generator function to provide live updates.
            :param data: The loaded DataFrame
            :param speed: Speed multiplier for updates (default is 1)
            """
            data['date'] = pd.to_datetime(data['date'])  # Ensure dates are in datetime format
            sorted_data = data.sort_values(by='date')

            start_date = sorted_data['date'].min()
            end_date = sorted_data['date'].max()

            current_date = start_date

            while current_date <= end_date:
                # Get all mentions for the current date
                current_mentions = sorted_data[sorted_data['date'] <= current_date]

                yield current_date, current_mentions

                current_date += timedelta(days=1)
                time.sleep(1 / speed)  # Adjust speed of updates


        def display_live_updates(data, translations):

            c1, c2 = st.columns(2)
            with c1:
                st.header(translations["current_social_engagements"])
            with c2:
                st.write("")
                st.write("")
                st.button(translations["start_stop_button"], disabled=True, use_container_width=True)


            st.markdown("""
                <style>
                .container {padding-top: 2rem;}
                .row {display: flex; justify-content: space-between; align-items: center; padding-bottom: 1rem;}
                .col {flex-basis: calc(50% - 1rem); margin-right: 1rem;}
                </style>
                """, unsafe_allow_html=True)

            container = st.container()

            with container:
                row1 = st.container()
                row2 = st.container()
                row3 = st.container()

                # Social Media Metrics
                with row1:
                    st.subheader(translations["social_media_metrics"])

                    # Create a list of metrics with their corresponding labels, values, and deltas
                    metrics = [
                            (("Mentions"), f"{data['mentions'].iloc[-1]:,}",
                             f"{data['mentions'].pct_change().iloc[-1] * 100:.2f}%"),
                            (("Unique Users"), f"{data['unique_users'].iloc[-1]:,}",
                             f"{data['unique_users'].pct_change().iloc[-1] * 100:.2f}%"),
                            (("Engagement Rate"), f"{data['engagement_rate'].iloc[-1]:.2f}%",
                             f"+{data['engagement_rate'].pct_change().iloc[-1] * 100:.2f}%"),
                            (("Sentiment Score"), f"{data['sentiment_score'].iloc[-1]:.4f}",
                             f"+{data['sentiment_score'].pct_change().iloc[-1] * 100:.2f}%"),
                            (("Total Users"), f"{data['total_users'].iloc[-1]:,}",
                             f"+{data['total_users'].pct_change().iloc[-1] * 100:.2f}%")
                        ]

                    # Create columns for the metrics
                    cols = st.columns(len(metrics))

                    # Display each metric in its own column
                    for col, (metric, value, delta) in zip(cols, metrics):
                        col.metric(metric, value, delta)
                # Platform Performance
                with row2:
                        st.subheader(translations["platform_performance"])
                        # List of platforms
                        platforms = ['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'YouTube']

                        # Create columns for each platform
                        cols = st.columns(len(platforms))

                        # Display each platform's metric in its own column
                        for col, platform in zip(cols, platforms):
                            col.metric(platform, f"{random.randint(500, 1500):,}", f"+{random.uniform(-5, 5):.2f}%")

                # Audience Insights
                with row3:
                        st.subheader(translations["audience_insights"])
                        total_users = data['total_users'].iloc[-1]
                        age_groups = {
                            ("18 - 24 years"): data['age_group_1824'].iloc[-1],
                            ("25 - 40 years"): data['age_group_2530'].iloc[-1],
                            ("40 - 55 years"): data['age_group_4055'].iloc[-1],
                            ("55+ years"): data['age_group_5565plus'].iloc[-1]
                        }

                        # Create a pie chart for age groups
                        chart_data = {
                            "labels": list(age_groups.keys()),
                            "values": list(age_groups.values()),
                            "colors": ["#FFD700", "#32CD32", "#FF8C00", "#4169E1"],
                            "title": translations["age_distribution_title"],
                            "showlegend": True,
                            "legend_title": translations["legend_title"]
                        }

                        # Display the pie chart
                        pie_chart = create_pie_chart(chart_data)
                        st.plotly_chart(pie_chart, use_container_width=True)

        def create_pie_chart(data):
            fig = go.Figure(data=[go.Pie(labels=data['labels'], values=data['values'])])
            fig.update_layout(title=data['title'])
            fig.update_traces(hole=.3)
            fig.update_layout(legend=dict(yanchor="top", y=0.99, xanchor="right", x=1.05))
            return fig


        # Load data
        live_data = load_live_data()
        # Define a dictionary to map option names to corresponding functions
        display_functions = {
            ("Live Updates"): display_live_updates,
        }

        # Call the appropriate function based on the selected option
        display_functions["Live Updates"](live_data, translations)
        graph_col, genai_col = st.columns([4, 2])
        with graph_col:
            st.header(translations['data_view'])
            if target and start_date and end_date:
                all_mentions = []
                # Filter the mentions based on the input
                for selected_target in target:
                    mentions = filter_mentions_by_date_range(data, selected_target, start_date, end_date)
                    all_mentions.extend(mentions)

                if all_mentions:
                    # Convert mentions to DataFrame
                    df = pd.DataFrame(all_mentions)
                    st.dataframe(df, use_container_width=True)
                else:
                    st.warning(f"No data found for {', '.join(target)} in the range {start_date} - {end_date}")
        with genai_col:
            st.header(translations['gen_ai'])
            # Initialize chat history
            if "messages" not in st.session_state:
                st.session_state.messages = []

            # Display chat messages from history on app rerun
            for message in st.session_state.messages:
                with st.chat_message(message["role"]):
                    st.markdown(message["content"])

            # Accept user input in the chat interface
            if prompt := st.chat_input("What would you like to know?"):
                # Add user message to chat history
                st.session_state.messages.append({"role": "user", "content": prompt})
                # Display user message in chat message container
                with st.chat_message("user"):
                    st.markdown(prompt)

                # Generate assistant response
                response = respond(prompt,
                                   f"You are a helpful assistant who answers questions about this dataset {data}")

                # Display assistant response in chat message container
                with st.chat_message("assistant"):
                    st.markdown(response)

                # Add assistant response to chat history
                st.session_state.messages.append({"role": "assistant", "content": response})

    # Ensure we're passing all selected companies
    # if target:
    #     # Count mentions for the selected and previous months across all targets
    #     mentions_current_month = count_mentions(data, target, month_name)
    #     mentions_previous_month = count_mentions(data, target, previous_month) if previous_month else {}
    #     st.header(translations['monthly_social_engagements_metrics'])
    #
    #     style_metric_cards(
    #         background_color="#00000000",  # Set the desired background color
    #         border_radius_px=10,  # Set border radius
    #         border_left_color="deepskyblue",
    #         border_color="deepskyblue"  # Set the border color
    #     )
    #
    #     # Display metrics with comparison
    #     if mentions_current_month:
    #         platforms = set(mentions_current_month.keys()).union(set(mentions_previous_month.keys()))
    #         # Use st.columns to display multiple metrics in a row
    #         cols = st.columns(len(platforms))
    #         for i, platform in enumerate(platforms):
    #             current_value = mentions_current_month.get(platform, 0)
    #             previous_value = mentions_previous_month.get(platform, 0) if previous_month else 0
    #             difference = current_value - previous_value
    #
    #             # Display metric in the appropriate column
    #             with cols[i]:
    #                 st.metric(label=f"{platform}", value=current_value, delta=difference)
    #     else:
    #         st.warning("No data available for the selected company in the specified months.")
    #     style_metric_cards(
    #         background_color="#00000000",  # Set the desired background color
    #         border_radius_px=10,  # Set border radius
    #         border_left_color="deepskyblue",
    #         border_color="deepskyblue"  # Set the border color
    #     )
    #
    #
    #     def load_live_data():
    #         # Replace this with your actual data loading logic
    #         df = pd.DataFrame({
    #             'date': ['2023-01-01', '2023-01-02', '2023-01-03'],
    #             'mentions': [100, 200, 300],
    #             'unique_users': [80, 90, 95],
    #             'engagement_rate': [60, 62, 64],
    #             'sentiment_score': [0.7, 0.75, 0.8],
    #             'total_users': [800, 820, 840],
    #             'age_group_1824': [20, 22, 24],
    #             'age_group_2530': [45, 47, 49],
    #             'age_group_4055': [15, 17, 19],
    #             'age_group_5565plus': [10, 12, 14]
    #         })
    #         return df
    #
    #
    #     def generate_live_updates(data, speed=1):
    #         """
    #         Generator function to provide live updates.
    #         :param data: The loaded DataFrame
    #         :param speed: Speed multiplier for updates (default is 1)
    #         """
    #         data['date'] = pd.to_datetime(data['date'])  # Ensure dates are in datetime format
    #         sorted_data = data.sort_values(by='date')
    #
    #         start_date = sorted_data['date'].min()
    #         end_date = sorted_data['date'].max()
    #
    #         current_date = start_date
    #
    #         while current_date <= end_date:
    #             # Get all mentions for the current date
    #             current_mentions = sorted_data[sorted_data['date'] <= current_date]
    #
    #             yield current_date, current_mentions
    #
    #             current_date += timedelta(days=1)
    #             time.sleep(1 / speed)  # Adjust speed of updates
    #
    #
    #     def display_live_updates(data, translations):
    #
    #         c1, c2 = st.columns(2)
    #         with c1:
    #             st.header(translations["current_social_engagements"])
    #         with c2:
    #             st.write("")
    #             st.write("")
    #             st.button(translations["start_stop_button"], disabled=True, use_container_width=True)
    #
    #
    #         st.markdown("""
    #             <style>
    #             .container {padding-top: 2rem;}
    #             .row {display: flex; justify-content: space-between; align-items: center; padding-bottom: 1rem;}
    #             .col {flex-basis: calc(50% - 1rem); margin-right: 1rem;}
    #             </style>
    #             """, unsafe_allow_html=True)
    #
    #         container = st.container()
    #
    #         with container:
    #             row1 = st.container()
    #             row2 = st.container()
    #             row3 = st.container()
    #
    #             # Social Media Metrics
    #             with row1:
    #                 st.subheader(translations["social_media_metrics"])
    #
    #                 # Create a list of metrics with their corresponding labels, values, and deltas
    #                 metrics = [
    #                         (("Mentions"), f"{data['mentions'].iloc[-1]:,}",
    #                          f"{data['mentions'].pct_change().iloc[-1] * 100:.2f}%"),
    #                         (("Unique Users"), f"{data['unique_users'].iloc[-1]:,}",
    #                          f"{data['unique_users'].pct_change().iloc[-1] * 100:.2f}%"),
    #                         (("Engagement Rate"), f"{data['engagement_rate'].iloc[-1]:.2f}%",
    #                          f"+{data['engagement_rate'].pct_change().iloc[-1] * 100:.2f}%"),
    #                         (("Sentiment Score"), f"{data['sentiment_score'].iloc[-1]:.4f}",
    #                          f"+{data['sentiment_score'].pct_change().iloc[-1] * 100:.2f}%"),
    #                         (("Total Users"), f"{data['total_users'].iloc[-1]:,}",
    #                          f"+{data['total_users'].pct_change().iloc[-1] * 100:.2f}%")
    #                     ]
    #
    #                 # Create columns for the metrics
    #                 cols = st.columns(len(metrics))
    #
    #                 # Display each metric in its own column
    #                 for col, (metric, value, delta) in zip(cols, metrics):
    #                     col.metric(metric, value, delta)
    #             # Platform Performance
    #             with row2:
    #                     st.subheader(translations["platform_performance"])
    #                     # List of platforms
    #                     platforms = ['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'YouTube']
    #
    #                     # Create columns for each platform
    #                     cols = st.columns(len(platforms))
    #
    #                     # Display each platform's metric in its own column
    #                     for col, platform in zip(cols, platforms):
    #                         col.metric(platform, f"{random.randint(500, 1500):,}", f"+{random.uniform(-5, 5):.2f}%")
    #
    #             # Audience Insights
    #             with row3:
    #                     st.subheader(translations["audience_insights"])
    #                     total_users = data['total_users'].iloc[-1]
    #                     age_groups = {
    #                         ("18 - 24 years"): data['age_group_1824'].iloc[-1],
    #                         ("25 - 40 years"): data['age_group_2530'].iloc[-1],
    #                         ("40 - 55 years"): data['age_group_4055'].iloc[-1],
    #                         ("55+ years"): data['age_group_5565plus'].iloc[-1]
    #                     }
    #
    #                     # Create a pie chart for age groups
    #                     chart_data = {
    #                         "labels": list(age_groups.keys()),
    #                         "values": list(age_groups.values()),
    #                         "colors": ["#FFD700", "#32CD32", "#FF8C00", "#4169E1"],
    #                         "title": translations["age_distribution_title"],
    #                         "showlegend": True,
    #                         "legend_title": translations["legend_title"]
    #                     }
    #
    #                     # Display the pie chart
    #                     pie_chart = create_pie_chart(chart_data)
    #                     st.plotly_chart(pie_chart, use_container_width=True)
    #
    #     def create_pie_chart(data):
    #         fig = go.Figure(data=[go.Pie(labels=data['labels'], values=data['values'])])
    #         fig.update_layout(title=data['title'])
    #         fig.update_traces(hole=.3)
    #         fig.update_layout(legend=dict(yanchor="top", y=0.99, xanchor="right", x=1.05))
    #         return fig
    #
    #
    #     # Load data
    #     live_data = load_live_data()
    #     # Define a dictionary to map option names to corresponding functions
    #     display_functions = {
    #         ("Live Updates"): display_live_updates,
    #     }
    #
    #     # Call the appropriate function based on the selected option
    #     display_functions["Live Updates"](live_data, translations)
    #     graph_col, genai_col = st.columns([4, 2])
    #     with graph_col:
    #         st.header(translations['data_view'])
    #         if target and month_name:
    #             all_mentions = []
    #             # Filter the mentions based on the input
    #             for selected_target in target:
    #                 mentions = filter_mentions(data, selected_target, month_name)
    #                 all_mentions.extend(mentions)
    #
    #             if all_mentions:
    #                 # Convert mentions to DataFrame
    #                 df = pd.DataFrame(all_mentions)
    #                 st.dataframe(df, use_container_width=True)
    #             else:
    #                 st.warning(f"No data found for {', '.join(target)} in {month_name_display}")
    #     with genai_col:
    #         st.header(translations['gen_ai'])
    #         # Initialize chat history
    #         if "messages" not in st.session_state:
    #             st.session_state.messages = []
    #
    #         # Display chat messages from history on app rerun
    #         for message in st.session_state.messages:
    #             with st.chat_message(message["role"]):
    #                 st.markdown(message["content"])
    #
    #         # Accept user input in the chat interface
    #         if prompt := st.chat_input("What would you like to know?"):
    #             # Add user message to chat history
    #             st.session_state.messages.append({"role": "user", "content": prompt})
    #             # Display user message in chat message container
    #             with st.chat_message("user"):
    #                 st.markdown(prompt)
    #
    #             # Generate assistant response
    #             response = respond(prompt,
    #                                f"You are a helpful assistant who answers questions about this dataset {data}")
    #
    #             # Display assistant response in chat message container
    #             with st.chat_message("assistant"):
    #                 st.markdown(response)
    #
    #             # Add assistant response to chat history
    #             st.session_state.messages.append({"role": "assistant", "content": response})

elif selected_index == 1:
    @st.cache_data
    def get_platform_groups():
        return {
            "Meta": ["Facebook", "Instagram"],
            "Google": ["YouTube", "Google Analytics", "Google News"],
            "News": ["eNCA News", "SABC News"],
            "X (Twitter)": ["X (Twitter)"],
            "Reddit": ["Reddit"],
            "Telegram": ["Telegram"],
            "LinkedIn": ["LinkedIn"]
        }


    def filter_mentions(data, company_choice, platform_group, sub_platform):
        mentions = []
        if company_choice in data:
            for mention in data[company_choice]['mentions']:
                if platform_group == "Meta" and mention['platform'] in ["Facebook", "Instagram"]:
                    if not sub_platform or mention['platform'] == sub_platform:
                        mentions.append(mention)
                elif platform_group == "Google" and mention['platform'] in ["YouTube", "Google Analytics",
                                                                            "Google News"]:
                    if not sub_platform or mention['platform'] == sub_platform:
                        mentions.append(mention)
                elif platform_group == "News" and mention['platform'] in ["eNCA News", "SABC News"]:
                    if not sub_platform or mention['platform'] == sub_platform:
                        mentions.append(mention)
                elif mention['platform'] == platform_group:
                    mentions.append(mention)
        return mentions


    def get_trend_data(mentions, period):
        df = pd.DataFrame(mentions)
        df['date'] = pd.to_datetime(df['date'])

        if period == 'Yearly':
            df = df.resample('Y', on='date').size()
        elif period == 'Monthly':
            df = df.resample('M', on='date').size()
        elif period == 'Weekly':
            df = df.resample('W', on='date').size()
        else:  # Daily
            df = df.resample('D', on='date').size()

        return df


    def get_content_type_distribution(mentions):
        df = pd.DataFrame(mentions)
        content_type_counts = df['content_type'].value_counts()
        return content_type_counts


    def safe_jsonify(obj):
        if isinstance(obj, pd.Series):
            return obj.to_list()
        if isinstance(obj, pd.DataFrame):
            return obj.to_dict(orient="records")
        if isinstance(obj, np.int64) or isinstance(obj, np.float64):
            return obj.item()
        return obj


    # Initialize session state for the selected platform and group
    if "selected_platform_group" not in st.session_state:
        st.session_state.selected_platform_group = None
    if "selected_platform" not in st.session_state:
        st.session_state.selected_platform = None

    # Load the data
    data = load_data()
    platform_groups = get_platform_groups()

    # Create a grid of buttons for each platform group
    platform_group_buttons = grid(len(platform_groups))
    for i, group in enumerate(platform_groups.keys()):
        if platform_group_buttons.button(group, use_container_width=True):
            # When a platform group button is clicked, store it in session state
            st.session_state.selected_platform_group = group
            st.session_state.selected_platform = None  # Reset the specific platform when group changes

    # If a platform group is selected, show specific platform options
    if st.session_state.selected_platform_group:
        group = st.session_state.selected_platform_group
        if group not in ["X (Twitter)", "Reddit", "Telegram", "LinkedIn"]:
            specific_platforms = ["All"] + platform_groups[group]
            st.session_state.selected_platform = st.selectbox(f"Select a specific platform in {group}",
                                                              specific_platforms)

    company_col, time_col = st.columns(2)
    with company_col:
        # company_choice = st.selectbox("Choose the company", ["Mr Price", "KZN Government", "Edgars"])
        company_choice = st.selectbox(translations['select_target_topic'], ["Mr Price", "KZN Government", "Edgars"])
    # Select the time period for the trend analysis
    with time_col:
        time_period = st.selectbox(translations['select_time_period'], ["Yearly", "Monthly", "Weekly", "Daily"])

    if st.session_state.selected_platform_group:
        if st.session_state.selected_platform == "All":
            series_data = []
            drilldown_series = []
            platform_trend_data = []
            for platform in platform_groups[st.session_state.selected_platform_group]:
                mentions = filter_mentions(data, company_choice, st.session_state.selected_platform_group, platform)
                content_type_distribution = get_content_type_distribution(mentions)
                platform_total = safe_jsonify(content_type_distribution.sum())
                series_data.append({
                    "name": platform,
                    "y": platform_total,
                    "drilldown": platform
                })
                drilldown_series.append({
                    "name": platform,
                    "id": platform,
                    "data": [[ct, safe_jsonify(count)] for ct, count in content_type_distribution.items()]
                })

                # Get trend data for this platform
                trend_data = get_trend_data(mentions, time_period)
                if not trend_data.empty:
                    platform_trend_data.append({
                        "name": platform,
                        "data": safe_jsonify(trend_data.tolist()),
                    })

            if series_data:
                col1, col2 = st.columns(2)

                # Display the spline chart for all platforms
                with col1:
                    x_labels = trend_data.index.strftime('%Y-%m-%d').tolist() if trend_data.index is not None else []
                    trend_chart_data = {
                        "chart": {
                            "type": "spline",
                            "plotBackgroundColor": None,
                            "plotBorderWidth": None,
                            "plotShadow": False,
                            "backgroundColor": 'rgba(0, 0, 0, 0)',  # Transparent background
                        },
                        "title": {
                            "text": f"{st.session_state.selected_platform_group} Platforms Trend for {company_choice} ({time_period})",
                            "style": {
                                "color": "white",  # Title text color
                                "fontWeight": "bold"
                            }
                        },
                        "xAxis": {
                            "categories": x_labels,
                            "labels": {
                                "style": {
                                    "color": "white"  # X-axis labels text color
                                }
                            },
                            "lineColor": "white",  # X-axis line color
                            "tickColor": "white"  # X-axis tick color
                        },
                        "yAxis": {
                            "title": {
                                "text": "Number of Mentions",
                                "style": {
                                    "color": "white"  # Y-axis title text color
                                }
                            },
                            "labels": {
                                "style": {
                                    "color": "white"  # Y-axis labels text color
                                }
                            },
                            "gridLineColor": "rgba(255, 255, 255, 0.2)",  # Y-axis grid line color
                            "lineColor": "white",  # Y-axis line color
                            "tickColor": "white"  # Y-axis tick color
                        },
                        "legend": {
                            "itemStyle": {
                                "color": "white"  # Legend text color
                            },
                            "itemHoverStyle": {
                                "color": "lightgray"  # Legend text color on hover
                            }
                        },
                        "series": platform_trend_data,
                        "tooltip": {
                            "backgroundColor": "rgba(0, 0, 0, 0.85)",  # Tooltip background color
                            "style": {
                                "color": "white"  # Tooltip text color
                            }
                        }
                    }
                    stc.streamlit_highcharts(trend_chart_data)

                # Display the pie chart with drilldown
                with col2:
                    pie_chart_data = {
                        "chart": {
                            "plotBackgroundColor": None,
                            "plotBorderWidth": None,
                            "plotShadow": False,
                            "textColor": "white",
                            'backgroundColor': 'rgba(0, 0, 0, 0)',  # Transparent background
                            "type": "pie"
                        },
                        "title": {
                            "style": {
                                "color": "white",  # Title text color
                                "fontWeight": "bold"
                            },
                            "text": f"{st.session_state.selected_platform_group} Platforms Content Type Distribution"
                        },
                        "subtitle": {
                            "style": {
                                "color": "white",  # Subtitle text color
                                "fontWeight": "bold"
                            },
                            "text": 'Click the slices to view content type distribution.'
                        },
                        "plotOptions": {
                            "series": {
                                "dataLabels": {
                                    "enabled": True,
                                    "format": '{point.name}: {point.y}',
                                    "style": {
                                        "color": "white",  # Data labels text color
                                        "textOutline": "none"  # This line removes the underline effect.
                                    }
                                }
                            }
                        },
                        "tooltip": {
                            "headerFormat": '<span style="font-size:11px; color:white">{series.name}</span><br>',
                            # Tooltip header text color
                            "pointFormat": '<span style="color:{point.color}">{point.name}</span>: <b style="color:white">{point.y}</b><br/>'
                            # Tooltip point text color
                        },
                        "series": [{
                            "name": "Platforms",
                            "colorByPoint": True,
                            "data": series_data,
                            "dataLabels": {
                                "style": {
                                    "color": "white"  # Platform names text color
                                }
                            }
                        }],
                        "drilldown": {
                            "series": [{
                                "name": "Platforms",
                                "colorByPoint": True,
                                "dataLabels": {
                                    "style": {
                                        "color": "white"  # Drilldown labels text color
                                    }
                                }
                            }] + drilldown_series  # Ensuring drilldown text is also white
                        }
                    }
                    stc.streamlit_highcharts(safe_jsonify(pie_chart_data))

        else:
            # Filter mentions for the selected platform group and company
            sub_platform = None if st.session_state.selected_platform == "All" else st.session_state.selected_platform
            mentions = filter_mentions(data, company_choice, st.session_state.selected_platform_group, sub_platform)
            trend_data = get_trend_data(mentions, time_period)

            if not trend_data.empty:
                # Adjust x-axis labels based on the selected time period
                if time_period == 'Yearly':
                    x_labels = trend_data.index.strftime('%Y').tolist()
                elif time_period == 'Monthly':
                    x_labels = trend_data.index.strftime('%Y-%m').tolist()
                elif time_period == 'Weekly':
                    x_labels = trend_data.index.strftime('Week %U, %Y').tolist()
                else:  # Daily
                    x_labels = trend_data.index.strftime('%Y-%m-%d').tolist()

                # Calculate content type distribution
                content_type_distribution = get_content_type_distribution(mentions)

                # Create two columns for side-by-side charts
                col1, col2 = st.columns(2)

                # Display trend chart
                with col1:
                    trend_chart_data = {
                        "chart": {
                            "type": "spline",
                            "plotBackgroundColor": None,
                            "plotBorderWidth": None,
                            "plotShadow": False,
                            "backgroundColor": 'rgba(0, 0, 0, 0)',  # Transparent background
                        },
                        "title": {
                            "text": f"{st.session_state.selected_platform} Mentions Trend for {company_choice} ({time_period})",
                            "style": {
                                "color": "white",  # Title text color
                                "fontWeight": "bold"
                            }
                        },
                        "xAxis": {
                            "categories": x_labels,
                            "labels": {
                                "style": {
                                    "color": "white"  # X-axis labels text color
                                }
                            },
                            "lineColor": "white",  # X-axis line color
                            "tickColor": "white"  # X-axis tick color
                        },
                        "yAxis": {
                            "title": {
                                "text": "Number of Mentions",
                                "style": {
                                    "color": "white"  # Y-axis title text color
                                }
                            },
                            "labels": {
                                "style": {
                                    "color": "white"  # Y-axis labels text color
                                }
                            },
                            "gridLineColor": "rgba(255, 255, 255, 0.2)",  # Y-axis grid line color
                            "lineColor": "white",  # Y-axis line color
                            "tickColor": "white"  # Y-axis tick color
                        },
                        "legend": {
                            "itemStyle": {
                                "color": "white"  # Legend text color
                            },
                            "itemHoverStyle": {
                                "color": "lightgray"  # Legend text color on hover
                            }
                        },
                        "series": [{
                            "name": "Mentions",
                            "data": safe_jsonify(trend_data.tolist()),
                            "color": "blue",  # Line color
                            "dataLabels": {
                                "enabled": False,  # Disable data labels
                                "style": {
                                    "color": "transparent"  # If labels are still there, make them invisible
                                }
                            }
                        }],
                        "tooltip": {
                            "backgroundColor": "rgba(0, 0, 0, 0.85)",  # Tooltip background color
                            "style": {
                                "color": "white"  # Tooltip text color
                            }
                        }
                    }
                    stc.streamlit_highcharts(trend_chart_data)

                # Display content type pie chart
                with col2:
                    pie_chart_data = {
                        "chart": {
                            "plotBackgroundColor": None,
                            "plotBorderWidth": None,
                            "plotShadow": False,
                            "textColor": "white",
                            'backgroundColor': 'rgba(0, 0, 0, 0)',  # Transparent background
                            "type": "pie"
                        },
                        "plotOptions": {
                            "pie": {
                                "allowPointSelect": True,
                                "cursor": 'pointer',
                                "dataLabels": {
                                    "enabled": True,
                                    "format": '<span style="font-size: 1.2em"><b>{point.name}</b>' +
                                              '</span><br>' +
                                              '<span style="opacity: 0.6">{point.percentage:.1f} ' +
                                              '%</span>',
                                    "connectorColor": 'rgba(128,128,128,0.5)'
                                }
                            }
                        },
                        "title": {
                            "style": {
                                "color": "white",
                                "fontWeight": "bold"
                            },
                            "text": f"{st.session_state.selected_platform} Content Type Distribution for {company_choice}"
                        },
                        "series": [{
                            "name": "Content Types",
                            "data": [{"name": ct, "y": safe_jsonify(count)} for ct, count in
                                     content_type_distribution.items()]
                        }]
                    }
                    stc.streamlit_highcharts(pie_chart_data)
            else:
                st.warning(f"No data available for the selected parameters.")

elif selected_index == 2:
    data = load_data()
    # Initialize chat history
    if "messages" not in st.session_state:
        st.session_state.messages = []

    # Display chat messages from history on app rerun
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # Accept user input
    if prompt := st.chat_input("What would you like to know?"):
        # Add user message to chat history
        st.session_state.messages.append({"role": "user", "content": prompt})
        # Display user message in chat message container
        with st.chat_message("user"):
            st.markdown(prompt)

        MAX_CONTENT_LENGTH = 256000  # Maximum length allowed by the API
        BUFFER_SIZE = 500  # Set a buffer to prevent exceeding the limit


        # Function to truncate the data to the maximum allowed size minus the buffer
        def truncate_data(data, max_length=MAX_CONTENT_LENGTH - BUFFER_SIZE):
            # Convert data to a string if it's not already a string
            data_str = str(data)
            if len(data_str) > max_length:
                return data_str[:max_length]  # Truncate the data to fit within the buffer
            return data_str


        # Truncate the data with the buffer
        truncated_data = truncate_data(data)

        # Generate assistant response with truncated data
        response = respond(prompt,
                           f"You are a helpful assistant who answers questions about social media analytics. Use this truncated data: {truncated_data}")

        # # Generate assistant response
        # response = respond(prompt, f"You are a helpful assistant who answers questions about social media analytics.You are to use the data from this file {data}")

        # Display assistant response in chat message container
        with st.chat_message("assistant"):
            st.markdown(response)

        # Add assistant response to chat history
        st.session_state.messages.append({"role": "assistant", "content": response})

# elif selected_index == 3:
#     data = load_data()
#     target_col, month_col, chart_col = st.columns(3)
#     # Multiselect for target entity
#     with target_col:
#         targets = st.multiselect(translations["select_target_topic"], list(data.keys()))
#
#     # Mapping month names to keys
#     month_mapping = {
#         "August 2024": "2024-08",
#         "July 2024": "2024-07"
#     }
#     with month_col:
#         # Select the month by actual name
#         month_name = st.selectbox(translations['select_target_month'], list(month_mapping.keys()))
#
#     with chart_col:
#         # Select the chart type
#         chart_type = st.selectbox(translations['select_chart_type'], ["sankey", "bar", "radar"])
#
#     if targets and month_name:
#         # Get the corresponding month key from the mapping
#         month = month_mapping[month_name]
#
#         if chart_type == "sankey":
#             # Initialize data for Sankey chart
#             sankey_data = []
#
#             sentiment_colors = {
#                 "Positive": "#0000FF",  # Blue for Positive
#                 "Negative": "#FF0000",  # Red for Negative
#                 "Neutral": "#FFBF00"  # Amber for Neutral
#             }
#
#             for target in targets:
#                 mentions = data.get(target, {}).get('mentions', [])
#                 if mentions:
#                     # Filter mentions by the selected month
#                     month_mentions = [mention for mention in mentions if month in mention['date']]
#                     if month_mentions:
#                         # Perform sentiment analysis
#                         sentiments = perform_sentiment_analysis(month_mentions)
#
#                         # Get platforms from mentions
#                         platforms = set(mention['platform'] for mention in month_mentions)
#
#                         for platform in platforms:
#                             platform_mentions = [mention for mention in month_mentions if
#                                                  mention['platform'] == platform]
#                             platform_sentiments = perform_sentiment_analysis(platform_mentions)
#
#                             for sentiment, count in platform_sentiments.items():
#                                 sankey_data.append({
#                                     "from": platform,  # Platform name as the source
#                                     "to": sentiment,  # Sentiment as the destination
#                                     "weight": count,
#                                     "color": sentiment_colors[sentiment]  # Assign color based on sentiment
#                                 })
#
#             if sankey_data:
#                 sankey_chart_data = {
#                     "chart": {"type": "sankey"},
#                     "title": {"text": f"Sankey Chart of Sentiment Analysis for {', '.join(targets)} in {month_name}"},
#                     "series": [{
#                         "keys": ["from", "to", "weight", "color"],
#                         "data": [[item["from"], item["to"], item["weight"], item["color"]] for item in sankey_data],
#                         "type": "sankey",
#                         "name": "Sentiment Flow",
#                         "link": {
#                             "colorByPoint": True  # Use the color specified for each flow
#                         },
#                         "nodes": [{
#                             "id": sentiment,
#                             "color": sentiment_colors[sentiment]
#                         } for sentiment in sentiment_colors.keys()]  # Color blocks for sentiments
#                     }]
#                 }
#                 # Display the Sankey chart
#                 stc.streamlit_highcharts(sankey_chart_data, height=600)
#             else:
#                 st.warning(f"No data found for the selected topics in {month_name}")
#
#         else:
#             # Existing logic for other chart types
#             series_data = []
#             for target in targets:
#                 mentions = data.get(target, {}).get('mentions', [])
#                 if mentions:
#                     month_mentions = [mention for mention in mentions if month in mention['date']]
#                     sentiments = perform_sentiment_analysis(month_mentions)
#                     if chart_type == "doughnut":
#                         series_data.append({
#                             "name": target,
#                             "data": [
#                                 {"name": "Positive", "y": sentiments['Positive']},
#                                 {"name": "Negative", "y": sentiments['Negative']},
#                                 {"name": "Neutral", "y": sentiments['Neutral']}
#                             ]
#                         })
#                     else:
#                         series_data.append({
#                             "name": target,
#                             "data": [sentiments['Positive'], sentiments['Negative'], sentiments['Neutral']]
#                         })
#
#             if series_data:
#                 chart_data = {
#                     "chart": {"type": chart_type if chart_type != "radar" else "line",
#                               "polar": True if chart_type == "radar" else False},
#                     "title": {"text": f"Sentiment Analysis for {', '.join(targets)} in {month_name}"},
#                     "xAxis": {"categories": ["Positive", "Negative", "Neutral"] if chart_type != "doughnut" else None,
#                               "tickmarkPlacement": "on" if chart_type == "radar" else None},
#                     "yAxis": {"title": {"text": ""}, "min": 0 if chart_type == "radar" else None},
#                     "legend": {"enabled": True},
#                     "series": series_data
#                 }
#
#                 # Display the combined chart
#                 stc.streamlit_highcharts(chart_data, height=600)
#
#             else:
#                 st.warning(f"No data found for the selected topics in {month_name}")
elif selected_index == 3:
    data = load_data()
    target_col, month_col, chart_col = st.columns(3)

    # Multiselect for target entity
    with target_col:
        targets = st.multiselect(translations["select_target_topic"], list(data.keys()))

    # Generate month_mapping dynamically from the data
    all_dates = sorted({mention['date'][:7] for company in data.values() for mention in company['mentions']})
    month_mapping = {f"{calendar.month_name[int(date[5:7])]} {date[:4]}": date for date in all_dates}

    with month_col:
        # Select the month by actual name
        month_name = st.selectbox(translations['select_target_month'], list(month_mapping.keys()))

    with chart_col:
        # Select the chart type
        chart_type = st.selectbox(translations['select_chart_type'], ["sankey", "bar", "radar"])

    if targets and month_name:
        # Get the corresponding month key from the mapping
        month = month_mapping[month_name]

        if chart_type == "sankey":
            # Initialize data for Sankey chart
            sankey_data = []

            sentiment_colors = {
                "Positive": "#0000FF",  # Blue for Positive
                "Negative": "#FF0000",  # Red for Negative
                "Neutral": "#FFBF00"  # Amber for Neutral
            }

            for target in targets:
                mentions = data.get(target, {}).get('mentions', [])
                if mentions:
                    # Filter mentions by the selected month
                    month_mentions = [mention for mention in mentions if month in mention['date']]
                    if month_mentions:
                        # Perform sentiment analysis
                        sentiments = perform_sentiment_analysis(month_mentions)

                        # Get platforms from mentions
                        platforms = set(mention['platform'] for mention in month_mentions)

                        for platform in platforms:
                            platform_mentions = [mention for mention in month_mentions if mention['platform'] == platform]
                            platform_sentiments = perform_sentiment_analysis(platform_mentions)

                            for sentiment, count in platform_sentiments.items():
                                sankey_data.append({
                                    "from": platform,  # Platform name as the source
                                    "to": sentiment,  # Sentiment as the destination
                                    "weight": count,
                                    "color": sentiment_colors[sentiment]  # Assign color based on sentiment
                                })

            if sankey_data:
                sankey_chart_data = {
                    "chart": {"type": "sankey"},
                    "title": {"text": f"Sankey Chart of Sentiment Analysis for {', '.join(targets)} in {month_name}"},
                    "series": [{
                        "keys": ["from", "to", "weight", "color"],
                        "data": [[item["from"], item["to"], item["weight"], item["color"]] for item in sankey_data],
                        "type": "sankey",
                        "name": "Sentiment Flow",
                        "link": {
                            "colorByPoint": True  # Use the color specified for each flow
                        },
                        "nodes": [{
                            "id": sentiment,
                            "color": sentiment_colors[sentiment]
                        } for sentiment in sentiment_colors.keys()]  # Color blocks for sentiments
                    }]
                }
                # Display the Sankey chart
                stc.streamlit_highcharts(sankey_chart_data, height=600)
            else:
                st.warning(f"No data found for the selected topics in {month_name}")

        else:
            # Existing logic for other chart types
            series_data = []
            for target in targets:
                mentions = data.get(target, {}).get('mentions', [])
                if mentions:
                    month_mentions = [mention for mention in mentions if month in mention['date']]
                    sentiments = perform_sentiment_analysis(month_mentions)
                    if chart_type == "doughnut":
                        series_data.append({
                            "name": target,
                            "data": [
                                {"name": "Positive", "y": sentiments['Positive']},
                                {"name": "Negative", "y": sentiments['Negative']},
                                {"name": "Neutral", "y": sentiments['Neutral']}
                            ]
                        })
                    else:
                        series_data.append({
                            "name": target,
                            "data": [sentiments['Positive'], sentiments['Negative'], sentiments['Neutral']]
                        })

            if series_data:
                chart_data = {
                    "chart": {"type": chart_type if chart_type != "radar" else "line",
                              "polar": True if chart_type == "radar" else False},
                    "title": {"text": f"Sentiment Analysis for {', '.join(targets)} in {month_name}"},
                    "xAxis": {"categories": ["Positive", "Negative", "Neutral"] if chart_type != "doughnut" else None,
                              "tickmarkPlacement": "on" if chart_type == "radar" else None},
                    "yAxis": {"title": {"text": ""}, "min": 0 if chart_type == "radar" else None},
                    "legend": {"enabled": True},
                    "series": series_data
                }

                # Display the combined chart
                stc.streamlit_highcharts(chart_data, height=600)

            else:
                st.warning(f"No data found for the selected topics in {month_name}")

elif selected_index == 4:
    # Load the JSON data
    with open("data-sources/Mentions-Data.json", "r") as file:
        data = json.load(file)

    # Select target (Mr Price or KZN Government)
    target = st.selectbox(translations["select_target_topic"], list(data.keys()))

    # Extract the mentions and their corresponding locations
    mentions_data = data[target]["mentions"]
    # Initialize a dictionary to count mentions per location
    location_counts = {}

    # Example mapping of location names to their corresponding hc-keys
    # Updated mapping of location names to their corresponding hc-keys
    location_to_hckey = {
        "Western Cape": "za-wc",
        "Eastern Cape": "za-ec",
        "Northern Cape": "za-nc",
        "North West": "za-nw",
        "Gauteng": "za-gt",
        "Mpumalanga": "za-mp",
        "Limpopo": "za-lp",
        "KwaZulu-Natal": "za-kzn",
        "Free State": "za-fs",
        "Nelspruit": "za-mp",  # Nelspruit is in Mpumalanga
        "Durban": "za-kzn",  # Durban is in KwaZulu-Natal
        "Port Elizabeth": "za-ec",  # Port Elizabeth is in Eastern Cape
        "Kimberley": "za-nc",  # Kimberley is in Northern Cape
        "Bloemfontein": "za-fs",  # Bloemfontein is in Free State
        "Pretoria": "za-gt",  # Pretoria is in Gauteng
        "Johannesburg": "za-gt",  # Johannesburg is in Gauteng
        "Cape Town": "za-wc",  # Cape Town is in Western Cape
        "East London": "za-ec",  # East London is in Eastern Cape
        "Polokwane": "za-lp"  # Polokwane is in Limpopo
    }

    # Count the mentions for each location
    for mention in mentions_data:
        location = mention["location"]
        # Map the location to its hc-key
        hc_key = location_to_hckey.get(location)
        if hc_key:
            if hc_key in location_counts:
                location_counts[hc_key] += 1
            else:
                location_counts[hc_key] = 1

    # Prepare data for Highcharts with proper hc-keys
    mapped_data = [{"hc-key": location, "value": count}
                   for location, count in location_counts.items()]

    # Define the Highcharts map JavaScript
    highcharts_map = f"""
    (async () => {{
        const topology = await fetch(
            'https://code.highcharts.com/mapdata/countries/za/za-all.topo.json'
        ).then(response => response.json());

        Highcharts.mapChart('container', {{
            chart: {{
                map: topology,
                borderRadius: 10,
                backgroundColor: '#ffffffb3',
            }},

            title: {{
                text: 'Mentions by Location, in South Africa',
                align: 'center'
            }},

            credits: {{
                href: 'https://data.worldbank.org',
                mapText: 'Data source: Updated Social Media Mentions'
            }},

            mapNavigation: {{
                enabled: true,
                buttonOptions: {{
                    verticalAlign: 'bottom'
                }}
            }},

            colorAxis: {{
            min: 15,
            max: 100,
            type: 'logarithmic',
            minColor: '#8B0000',
            maxColor: '#00008B'
        }},

            series: [{{
                data: {json.dumps(mapped_data)},
                name: 'Mentions',
                joinBy: 'hc-key',
                states: {{
                    hover: {{
                        color: '#660033'
                    }}
                }},
                dataLabels: {{
                    enabled: true,
                    format: '{{point.name}}: {{point.value}} mentions'
                }}
            }}],

            tooltip: {{
                valueDecimals: 1,
                valueSuffix: ' mentions'
            }}

        }});

    }})();
    """
    map_col, dataframe_col = st.columns([8, 2])
    with map_col:
        # Embed the Highcharts map in Streamlit
        components.html(
            f"""
            <div id="container" style="width:100%; height: 600px;"></div>
            <script src="https://code.highcharts.com/maps/highmaps.js"></script>
            <script src="https://code.highcharts.com/maps/modules/exporting.js"></script>
            <script src="https://code.highcharts.com/maps/modules/offline-exporting.js"></script>
            <script>{highcharts_map}</script>
            """,
            height=750,
        )
    with dataframe_col:
        def get_top_locations(data, target_company):
            locations = []
            if target_company in data:
                for mention in data[target_company]['mentions']:
                    location = mention.get('location')
                    if location:
                        locations.append(location)

            # Count occurrences of each location
            location_counts = Counter(locations)
            return location_counts


        location_counts = get_top_locations(data, target)

        # Create a DataFrame from the counts
        df_top_locations = pd.DataFrame(location_counts.items(), columns=["Top Locations", "Mentions"])

        # Sort the DataFrame by the number of mentions
        df_top_locations = df_top_locations.sort_values(by="Mentions", ascending=False)

        # Display the DataFrame in Streamlit
        st.dataframe(df_top_locations,
                     column_order=("Top Locations", "Mentions"),
                     hide_index=True,
                     width=None,
                     column_config={
                         "Top Locations": st.column_config.TextColumn(
                             "Top Locations",
                         ),
                         "Mentions": st.column_config.ProgressColumn(
                             "Mentions",
                             format="%d",
                             min_value=0,
                             max_value=max(df_top_locations.Mentions),
                         )}
                     )

elif selected_index == 5:
    data = load_data()


    def plot_heatmap():
        # Prepare data for the heatmap
        heatmap_data = []
        unique_companies = set()
        month_mention_count = defaultdict(lambda: {month: 0 for month in range(1, 13)})

        for company, company_data in data.items():
            unique_companies.add(company)
            for mention in company_data['mentions']:
                month = int(mention['date'][5:7])  # Extract the month part
                month_mention_count[company][month] += 1  # Increment count for the corresponding month

        # Convert unique companies to a sorted list
        unique_companies = sorted(unique_companies)

        # Convert the dictionary into a format suitable for Highcharts
        highcharts_data = []
        for i, company in enumerate(unique_companies):
            for month in range(1, 13):
                count = month_mention_count[company][month]
                highcharts_data.append([month - 1, i, count])
        # st.write(highcharts_data)

        # Highcharts configuration
        heatmap_config = {
            "chart": {
                "type": "heatmap",
                "plotBorderWidth": 1,
                "backgroundColor": 'transparent'
            },
            "title": {
                "text": "Heatmap of Mentions Over Time",
                "style": {
                    "color": "#FFFFFF"
                }
            },
            "xAxis": {
                "categories": ["January", "February", "March", "April", "May", "June", "July", "August", "September",
                               "October", "November", "December"],
                "title": {
                    "text": "Month",
                    "style": {
                        "color": "#FFFFFF"
                    }
                },
                "labels": {
                    "style": {
                        "color": "#FFFFFF"
                    }
                }
            },
            "yAxis": {
                "categories": ["Mr Price", "KZN Government", "Edgars"],
                "title": {
                    "text": "Company",
                    "style": {
                        "color": "#FFFFFF"
                    }
                },
                "labels": {
                    "style": {
                        "color": "#FFFFFF"
                    }
                }
            },
            "colorAxis": {
                "stops": [
                    [0, "#8B0000"],  # Dark red for the minimum value
                    [0.2, "#FF4500"],  # Red-orange
                    [0.4, "#FF8C00"],  # Dark orange
                    [0.6, "#1E90FF"],  # Dodger blue
                    [0.8, "#4169E1"],  # Royal blue
                    [1, "#00008B"]  # Dark blue for the maximum value
                ],
                "min": 0,
                "max": 60,  # Adjust max based on your data range
            },
            "legend": {
                "align": "center",
                "layout": "horizontal",
                "margin": 0,
                "verticalAlign": "top",
                "y": 20,
                "x": 0,
                "symbolWidth": 280,
                "itemStyle": {
                    "color": "#FFFFFF"
                }
            },
            "series": [{
                "name": "Mentions per Month",
                "borderWidth": 1,
                "data": highcharts_data,
                "dataLabels": {
                    "enabled": True,
                    "color": "#FFFFFF"
                },
            }],
        }

        # Render the Highcharts heatmap in Streamlit
        stc.streamlit_highcharts(heatmap_config, 650)


    def display_report(data, translations):

        # Report Generation
        st.header(translations["generate_report"])
        report_type = st.selectbox(("Select Report Type"), ["Full Report", "Summary Report", "Custom Report"])

        if st.button(translations["generate_report"], use_container_width=True):
            report = generate_report(data, report_type)
            st.text_area(("Generated Report"), report, height=300)
            # st.markdown(export_csv(pd.DataFrame({'Report': [report]}), filename="social_media_report.csv",
            #                        button_text=("Download Report as CSV")), unsafe_allow_html=True)

        # Report Scheduling
        st.header(translations["schedule_automated_reports"])

        recipient_email = st.text_input(("Enter recipient email address"))
        sender_email = st.text_input(("Enter your email address"))
        sender_password = st.text_input(("Enter your email password"), type="password")
        email_provider = st.selectbox(("Select your email provider"), list(EMAIL_PROVIDERS.keys()))
        frequency = st.selectbox(("Select report frequency"), ["Daily", "Weekly", "Monthly"])

        if st.button(("Schedule Reports"), use_container_width=True):
            if recipient_email and sender_email and sender_password and email_provider:
                schedule_report(recipient_email, frequency, sender_email, sender_password, email_provider)
                st.success(
                    ("Reports scheduled to be sent {frequency} to {recipient_email}").format(
                        frequency=frequency.lower(),
                        recipient_email=recipient_email))
            else:
                st.error(("Please fill in all fields"))

        # Display scheduled reports
        st.header(("Scheduled Reports"))
        if scheduled_reports:
            for i, report in enumerate(scheduled_reports):
                st.write(
                    f"{i + 1}. To: {report['email']}, Frequency: {report['frequency']}, Next Run: {report['next_run']}")
        else:
            st.write(("No reports scheduled"))


    def generate_report(data, report_type):
        # Flatten the data structure into a DataFrame
        rows = []
        for company, mentions_data in data.items():
            for mention in mentions_data['mentions']:
                rows.append({
                    'Company': company,
                    'Platform': mention['platform'],
                    'Date': mention['date'],
                    'Mention': mention['mention'],
                    'Content Type': mention['content_type'],
                    'Location': mention['location']
                })

        # Convert the list of dictionaries into a DataFrame
        df = pd.DataFrame(rows)

        if report_type == "Full Report":
            # Create a full report as a CSV
            plot_heatmap()
            report = df.to_csv(index=False)
        elif report_type == "Summary Report":
            # Create a summary report, e.g., by counting mentions per company
            summary = df.groupby('Company').size().reset_index(name='Mention Count')
            report = summary.to_csv(index=False)
        else:  # Custom Report
            report = "Custom Social Media Analytics Report\n\n"
            # Add custom logic here based on your requirements

        return report


    # Global variables
    scheduled_reports = []

    # Email provider configurations
    EMAIL_PROVIDERS = {
        'Gmail': {'smtp_server': 'smtp.gmail.com', 'smtp_port': 587},
        'Outlook': {'smtp_server': 'smtp-mail.outlook.com', 'smtp_port': 587},
        'Yahoo': {'smtp_server': 'smtp.mail.yahoo.com', 'smtp_port': 587},
        # Add more providers as needed
    }


    def schedule_report(email, frequency, sender_email, sender_password, email_provider):
        now = datetime.now()
        if frequency == 'Daily':
            next_run = now.replace(hour=8, minute=0, second=0, microsecond=0) + timedelta(days=1)
        elif frequency == 'Weekly':
            days_ahead = 7 - now.weekday()
            next_run = now.replace(hour=8, minute=0, second=0, microsecond=0) + timedelta(days=days_ahead)
        elif frequency == 'Monthly':
            if now.month == 12:
                next_run = now.replace(year=now.year + 1, month=1, day=1, hour=8, minute=0, second=0, microsecond=0)
            else:
                next_run = now.replace(month=now.month + 1, day=1, hour=8, minute=0, second=0, microsecond=0)

        scheduled_reports.append({
            'email': email,
            'frequency': frequency,
            'next_run': next_run,
            'sender_email': sender_email,
            'sender_password': sender_password,
            'email_provider': email_provider
        })


    def send_email(recipient, subject, body, sender_email, sender_password, email_provider):
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = recipient
        msg['Subject'] = subject

        msg.attach(MIMEText(body, 'plain'))

        try:
            server = smtplib.SMTP(EMAIL_PROVIDERS[email_provider]['smtp_server'],
                                  EMAIL_PROVIDERS[email_provider]['smtp_port'])
            server.starttls()
            server.login(sender_email, sender_password)
            text = msg.as_string()
            server.sendmail(sender_email, recipient, text)
            server.quit()
            print(f"Email sent successfully to {recipient}")
        except Exception as e:
            print(f"Failed to send email: {str(e)}")


    def run_scheduler():
        while True:
            now = datetime.now()
            for report in scheduled_reports:
                if now >= report['next_run']:
                    send_scheduled_report(report['email'], report['sender_email'],
                                          report['sender_password'], report['email_provider'])
                    if report['frequency'] == 'Daily':
                        report['next_run'] += timedelta(days=1)
                    elif report['frequency'] == 'Weekly':
                        report['next_run'] += timedelta(days=7)
                    elif report['frequency'] == 'Monthly':
                        if report['next_run'].month == 12:
                            report['next_run'] = report['next_run'].replace(year=report['next_run'].year + 1, month=1)
                        else:
                            report['next_run'] = report['next_run'].replace(month=report['next_run'].month + 1)
            time.sleep(60)  # Check every minute


    def send_scheduled_report(email, sender_email, sender_password, email_provider):
        data = load_data()  # Your function to load the latest data
        report = generate_report(data, "Full Report")  # Assuming you want to send a full report
        send_email(email, "Your Scheduled Social Media Analytics Report", report,
                   sender_email, sender_password, email_provider)


    display_report(data, translations)
    # Start the scheduler in a separate thread
    scheduler_thread = threading.Thread(target=run_scheduler)
    scheduler_thread.start()

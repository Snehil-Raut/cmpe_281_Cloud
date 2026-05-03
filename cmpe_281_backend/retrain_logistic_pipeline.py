import io
import json
import os
import urllib.request

import boto3
import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

# Public NSL-KDD mirror (headerless, 43-column format with label + difficulty)
PUBLIC_TRAIN_URL = os.environ.get(
    "PUBLIC_TRAIN_URL",
    "https://raw.githubusercontent.com/defcom17/NSL_KDD/master/KDDTrain+.txt"
)
MODELS_BUCKET = os.environ.get("MODELS_BUCKET", "honey-pot-models1")
MODEL_NAME = os.environ.get("MODEL_NAME", "logistic_regression")

RAW_COLUMNS_WITH_LABEL = [
    "duration", "protocol_type", "service", "flag",
    "src_bytes", "dst_bytes", "land", "wrong_fragment", "urgent",
    "hot", "num_failed_logins", "logged_in", "num_compromised",
    "root_shell", "su_attempted", "num_root", "num_file_creations",
    "num_shells", "num_access_files", "num_outbound_cmds",
    "is_host_login", "is_guest_login", "count", "srv_count",
    "serror_rate", "srv_serror_rate", "rerror_rate", "srv_rerror_rate",
    "same_srv_rate", "diff_srv_rate", "srv_diff_host_rate",
    "dst_host_count", "dst_host_srv_count", "dst_host_same_srv_rate",
    "dst_host_diff_srv_rate", "dst_host_same_src_port_rate",
    "dst_host_srv_diff_host_rate", "dst_host_serror_rate",
    "dst_host_srv_serror_rate", "dst_host_rerror_rate",
    "dst_host_srv_rerror_rate", "label", "difficulty_level"
]



def build_training_frame(raw_csv_text):
    df = pd.read_csv(io.StringIO(raw_csv_text), header=None, names=RAW_COLUMNS_WITH_LABEL)
    df = df.drop(columns=["difficulty_level"])
    df["target"] = df["label"].apply(lambda x: 0 if str(x).strip().lower() == "normal" else 1)
    df = df.drop(columns=["label"])
    df = pd.get_dummies(df, columns=["protocol_type", "service", "flag"], drop_first=False)

    x = df.drop(columns=["target"])
    y = df["target"]
    return x, y


def main():
    s3 = boto3.client("s3")

    # Load canonical feature list from DT (already uploaded in S3)
    print("Loading canonical feature list from S3 (decision_tree_features.json)…")
    feat_obj = s3.get_object(Bucket=MODELS_BUCKET, Key="decision_tree_features.json")
    canonical_features = json.loads(feat_obj["Body"].read().decode("utf-8"))
    print(f"Canonical feature count: {len(canonical_features)}")

    print(f"Downloading training data from: {PUBLIC_TRAIN_URL}")
    with urllib.request.urlopen(PUBLIC_TRAIN_URL) as resp:
        csv_text = resp.read().decode("utf-8")

    x, y = build_training_frame(csv_text)

    # Align to canonical feature list (same 122 cols as DT/RF)
    x = x.reindex(columns=canonical_features, fill_value=0)
    feature_columns = canonical_features
    print(f"Training frame shape after alignment: {x.shape}")

    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", LogisticRegression(max_iter=1000, random_state=42))
    ])

    pipeline.fit(x_train, y_train)
    y_pred = pipeline.predict(x_test)

    acc = accuracy_score(y_test, y_pred)
    print(f"Test accuracy: {acc:.4f}")
    print("Confusion matrix:\n", confusion_matrix(y_test, y_pred))
    print("Classification report:\n", classification_report(y_test, y_pred))

    model_buffer = io.BytesIO()
    joblib.dump(pipeline, model_buffer)
    model_buffer.seek(0)

    features_bytes = json.dumps(feature_columns).encode("utf-8")

    print(f"Uploading model artifact: s3://{MODELS_BUCKET}/{MODEL_NAME}.pkl")
    s3.put_object(Bucket=MODELS_BUCKET, Key=f"{MODEL_NAME}.pkl", Body=model_buffer.getvalue())

    print(f"Uploading feature list: s3://{MODELS_BUCKET}/{MODEL_NAME}_features.json")
    s3.put_object(Bucket=MODELS_BUCKET, Key=f"{MODEL_NAME}_features.json", Body=features_bytes)

    print("Done. Logistic pipeline model and feature list uploaded.")


if __name__ == "__main__":
    main()

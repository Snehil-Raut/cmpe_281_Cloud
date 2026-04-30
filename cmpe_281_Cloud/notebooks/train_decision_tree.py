
import pandas as pd
import joblib

columns = [
    'duration', 'protocol_type', 'service', 'flag',
    'src_bytes', 'dst_bytes', 'land', 'wrong_fragment', 'urgent',
    'hot', 'num_failed_logins', 'logged_in', 'num_compromised',
    'root_shell', 'su_attempted', 'num_root', 'num_file_creations',
    'num_shells', 'num_access_files', 'num_outbound_cmds',
    'is_host_login', 'is_guest_login', 'count', 'srv_count',
    'serror_rate', 'srv_serror_rate', 'rerror_rate', 'srv_rerror_rate',
    'same_srv_rate', 'diff_srv_rate', 'srv_diff_host_rate',
    'dst_host_count', 'dst_host_srv_count', 'dst_host_same_srv_rate',
    'dst_host_diff_srv_rate', 'dst_host_same_src_port_rate',
    'dst_host_srv_diff_host_rate', 'dst_host_serror_rate',
    'dst_host_srv_serror_rate', 'dst_host_rerror_rate',
    'dst_host_srv_rerror_rate', 'label', 'difficulty_level'
]

DATA_PATH = "s3://cmpe281-risk-detection/cmpe_281_data_models/data/raw/KDDTrain+.csv"
df = pd.read_csv(DATA_PATH, header=None, names=columns)

# Drop metadata
df.drop(columns=['difficulty_level'], inplace=True)

# Binary target
df['target'] = df['label'].apply(lambda x: 0 if x == 'normal' else 1)
df.drop(columns=['label'], inplace=True)

# One-hot encoding
df = pd.get_dummies(df, columns=['protocol_type', 'service', 'flag'])

# Separate features and target
X = df.drop(columns=['target'])
y = df['target']

print("Shape:", df.shape)
print("Object cols left:", list(X.select_dtypes(include='object').columns))
print("Target balance:\n", y.value_counts())
print("Missing values:", df.isnull().sum().sum())
print("Duplicate rows:", df.duplicated().sum())
print(X.shape)
print(y.value_counts(normalize=True) * 100)

from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(X_train.shape, X_test.shape)

# Create model
dt_model = DecisionTreeClassifier(random_state=42)

# Train
dt_model.fit(X_train, y_train)

# Predict on test data
y_pred_dt = dt_model.predict(X_test)

# Results
print("Test Accuracy:", accuracy_score(y_test, y_pred_dt))
print("\nConfusion Matrix:\n", confusion_matrix(y_test, y_pred_dt))
print("\nClassification Report:\n", classification_report(y_test, y_pred_dt))

# Check training accuracy
y_train_pred_dt = dt_model.predict(X_train)
print("Train Accuracy:", accuracy_score(y_train, y_train_pred_dt))

# Save model
joblib.dump(dt_model, "decision_tree.pkl")

# Save metrics
report = classification_report(y_test, y_pred_dt, output_dict=True)

results = {
    "model": "decision_tree",
    "accuracy": accuracy_score(y_test, y_pred_dt),
    "precision_attack": report["1"]["precision"],
    "recall_attack": report["1"]["recall"],
    "f1_attack": report["1"]["f1-score"],
    "precision_macro": report["macro avg"]["precision"],
    "recall_macro": report["macro avg"]["recall"],
    "f1_macro": report["macro avg"]["f1-score"],
    "train_accuracy": accuracy_score(y_train, y_train_pred_dt)
}

pd.DataFrame([results]).to_csv("decision_tree_metrics.csv", index=False)

print("Model saved as decision_tree.pkl")
print("Metrics saved as decision_tree_metrics.csv")


